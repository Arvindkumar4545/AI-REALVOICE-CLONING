from __future__ import annotations

import json
import random
from pathlib import Path

import librosa
import numpy as np
import pandas as pd
import soundfile as sf
import torch
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from torch import nn
from torch.utils.data import DataLoader, Dataset

from .dataset import BASE_DIR, build_dataset_manifest, iter_rows_by_split
from .model import AudioSpoofNet

MODEL_DIR = BASE_DIR / "models" / "voiceshield_best"
REPORT_DIR = BASE_DIR / "reports"
MANIFEST_DIR = BASE_DIR / "manifests"

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)


class AudioDataset(Dataset):
    def __init__(self, rows: pd.DataFrame, max_samples: int | None = None, sr: int = 16000) -> None:
        self.rows = rows.copy().reset_index(drop=True)
        
        # OPTIMIZATION: Skip expensive validation in __init__
        # Instead, sample first, THEN validate only the sampled files
        if max_samples is not None and len(self.rows) > max_samples:
            self.rows = self.rows.sample(n=max_samples, random_state=SEED).reset_index(drop=True)
        
        # Quick path existence check (no audio decoding, no feature extraction)
        valid_rows = []
        for _, row in self.rows.iterrows():
            if Path(row["path"]).exists():
                valid_rows.append(row)
        self.rows = pd.DataFrame(valid_rows).reset_index(drop=True)
        
        self.sr = sr
        self._feature_cache = {}  # Cache extracted features to avoid recomputation

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.rows.iloc[idx]
        file_path = str(row["path"])
        
        # Try to use cached feature if available
        if file_path in self._feature_cache:
            feature = self._feature_cache[file_path]
        else:
            try:
                feature = _extract_feature(file_path, self.sr)
                # Cache the feature for potential reuse
                self._feature_cache[file_path] = feature
            except Exception as e:
                # If feature extraction fails, return a zero tensor
                print(f"Warning: Failed to extract feature from {file_path}: {e}")
                feature = torch.zeros(1, 40, 96, dtype=torch.float32)
        
        label = 1.0 if row["label"] == "bonafide" else 0.0
        return feature, torch.tensor(label, dtype=torch.float32)


def _extract_feature(file_path: str, sr: int = 16000) -> torch.Tensor:
    y, _ = librosa.load(file_path, sr=sr, mono=True)
    target_samples = sr * 4
    if len(y) < target_samples:
        y = np.pad(y, (0, target_samples - len(y)), mode="constant")
    else:
        y = y[:target_samples]

    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=40,
        n_fft=512,
        hop_length=160,
        win_length=400,
        fmin=20,
        fmax=8000,
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)
    log_mel = (log_mel - np.mean(log_mel)) / (np.std(log_mel) + 1e-6)
    feature = torch.from_numpy(log_mel.astype(np.float32)).unsqueeze(0)

    if feature.shape[-1] < 96:
        pad = 96 - feature.shape[-1]
        feature = torch.nn.functional.pad(feature, (0, pad))
    else:
        feature = feature[..., :96]

    return feature


def _train_epoch(model, loader, criterion, optimizer, positive_weight: float = 1.0):
    model.train()
    total_loss = 0.0
    for features, labels in loader:
        optimizer.zero_grad()
        outputs = model(features)
        loss = criterion(outputs, labels)
        if positive_weight != 1.0:
            loss = (loss * torch.where(labels > 0.5, positive_weight, 1.0)).mean()
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * len(labels)
    return total_loss / len(loader.dataset)


@torch.no_grad()
def evaluate(model, loader):
    model.eval()
    probs = []
    labels = []
    for features, batch_labels in loader:
        outputs = model(features)
        probs.extend(outputs.cpu().numpy().tolist())
        labels.extend(batch_labels.cpu().numpy().astype(int).tolist())
    probs = np.asarray(probs)
    labels = np.asarray(labels)
    preds = (probs >= 0.5).astype(int)
    return {
        "loss": None,
        "accuracy": float(accuracy_score(labels, preds)),
        "precision": float(precision_score(labels, preds, zero_division=0)),
        "recall": float(recall_score(labels, preds, zero_division=0)),
        "f1": float(f1_score(labels, preds, zero_division=0)),
        "predictions": probs,
        "labels": labels,
    }


def _load_manifest() -> pd.DataFrame:
    manifest_path = MANIFEST_DIR / "dataset_manifest.csv"
    if manifest_path.exists():
        return pd.read_csv(manifest_path)
    return build_dataset_manifest(BASE_DIR)


def train_model(
    max_train_samples: int = 3000,
    max_dev_samples: int = 800,
    epochs: int = 10,
    balance_classes: bool = True,
) -> dict:
    manifest = _load_manifest()
    split_rows = iter_rows_by_split(manifest)
    train_rows = split_rows["train"]
    dev_rows = split_rows["dev"]

    if train_rows.empty or dev_rows.empty:
        raise ValueError("Train/dev splits are empty. Check the dataset manifest.")

    train_dataset = AudioDataset(train_rows, max_samples=max_train_samples)
    dev_dataset = AudioDataset(dev_rows, max_samples=max_dev_samples)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    dev_loader = DataLoader(dev_dataset, batch_size=64, shuffle=False)

    model = AudioSpoofNet()
    bonafide_count = max(1, int((train_rows["label"] == "bonafide").sum()))
    spoof_count = max(1, int((train_rows["label"] == "spoof").sum()))
    positive_weight = spoof_count / bonafide_count if balance_classes else 1.0
    criterion = nn.BCELoss()

    class_weights = {"bonafide": positive_weight, "spoof": 1.0}
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)

    best_state = None
    best_dev = -1.0
    history = []

    for epoch in range(1, epochs + 1):
        train_loss = _train_epoch(model, train_loader, criterion, optimizer, positive_weight)
        dev_metrics = evaluate(model, dev_loader)
        history.append({"epoch": epoch, "train_loss": train_loss, "val_accuracy": dev_metrics["accuracy"], "val_f1": dev_metrics["f1"]})

        if dev_metrics["f1"] > best_dev:
            best_dev = dev_metrics["f1"]
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}

        print(f"Epoch {epoch}/{epochs} | train_loss={train_loss:.4f} | val_acc={dev_metrics['accuracy']:.4f} | val_f1={dev_metrics['f1']:.4f}")

    if best_state is None:
        raise RuntimeError("Training did not produce any valid checkpoint.")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(best_state, MODEL_DIR / "model.pt")

    with open(MODEL_DIR / "training_history.json", "w", encoding="utf-8") as handle:
        json.dump(history, handle, indent=2)

    return {
        "history": history,
        "best_f1": best_dev,
        "model_path": str(MODEL_DIR / "model.pt"),
    }


def run_evaluation(model_path: str | Path) -> dict:
    manifest = _load_manifest()
    split_rows = iter_rows_by_split(manifest)
    eval_rows = split_rows["eval"]
    eval_dataset = AudioDataset(eval_rows, max_samples=2500)
    eval_loader = DataLoader(eval_dataset, batch_size=64, shuffle=False)

    model = AudioSpoofNet()
    state = torch.load(model_path, map_location="cpu")
    model.load_state_dict(state)
    metrics = evaluate(model, eval_loader)

    report = {
        "n_eval_samples": int(len(eval_rows)),
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1": metrics["f1"],
    }

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    with open(REPORT_DIR / "evaluation_report.json", "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    text = (
        "VoiceShield evaluation report\n"
        f"Accuracy: {report['accuracy']:.4f}\n"
        f"Precision: {report['precision']:.4f}\n"
        f"Recall: {report['recall']:.4f}\n"
        f"F1: {report['f1']:.4f}\n"
        f"Held-out samples: {report['n_eval_samples']}\n"
    )
    with open(REPORT_DIR / "evaluation_report.txt", "w", encoding="utf-8") as handle:
        handle.write(text)

    return report


if __name__ == "__main__":
    training_summary = train_model()
    print(json.dumps(training_summary, indent=2))
    eval_summary = run_evaluation(MODEL_DIR / "model.pt")
    print(json.dumps(eval_summary, indent=2))
