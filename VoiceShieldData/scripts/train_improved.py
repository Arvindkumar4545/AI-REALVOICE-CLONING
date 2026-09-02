"""
VoiceShield Improved Training Pipeline with Class Balancing & EER Optimization
Addresses the severe class imbalance observed in baseline ASVspoof 2019 dataset.
"""
from __future__ import annotations

import json
import random
import time
from pathlib import Path
from typing import Tuple, Dict, Any

import numpy as np
import pandas as pd
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
)
from scipy.optimize import brentq
from scipy.interpolate import interp1d

from voice_shield.model import AudioSpoofNet
from voice_shield.dataset import BASE_DIR, build_dataset_manifest, iter_rows_by_split
from voice_shield.train import AudioDataset, _extract_feature
from voice_shield.preprocessing import apply_audio_augmentation, extract_log_mel_spectrogram, load_audio_safe

CHECKPOINT_DIR = BASE_DIR / "checkpoints" / "voiceshield_improved"
REPORTS_DIR = BASE_DIR / "reports"
MANIFEST_DIR = BASE_DIR / "manifests"

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)


def compute_eer(labels: np.ndarray, scores: np.ndarray) -> Tuple[float, float]:
    """
    Computes Equal Error Rate (EER) and optimal operating threshold.
    Scores represent probability of bonafide (higher = more genuine).
    """
    fpr, tpr, thresholds = roc_curve(labels, scores, pos_label=1)
    fnr = 1 - tpr
    eer = float(brentq(lambda x: 1.0 - x - interp1d(fpr, tpr)(x), 0.0, 1.0))
    optimal_idx = np.nanargmin(np.abs(fnr - fpr))
    optimal_threshold = float(thresholds[optimal_idx])
    return eer, optimal_threshold


class AugmentedAudioDataset(AudioDataset):
    """AudioDataset that applies channel augmentation during training only."""

    def __init__(self, rows: pd.DataFrame, max_samples: int | None, augment: bool) -> None:
        super().__init__(rows, max_samples=max_samples)
        self.augment = augment

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.rows.iloc[idx]
        waveform = load_audio_safe(row["path"])
        if self.augment:
            waveform = apply_audio_augmentation(waveform, telephony_mode=True, noise_prob=0.7, gain_prob=0.4, shift_prob=0.4)
        feature = extract_log_mel_spectrogram(waveform, augment=False)
        label = 1.0 if row["label"] == "bonafide" else 0.0
        return feature, torch.tensor(label, dtype=torch.float32)


def train_improved_model(
    max_train_samples: int = 3000,
    max_dev_samples: int = 800,
    epochs: int = 50,
    batch_size: int = 32,
    learning_rate: float = 3e-4,
    device_str: str | None = None,
) -> Dict[str, Any]:
    """
    Executes balanced model training with weighted BCE loss and cosine learning rate decay.
    """
    device = torch.device(device_str if device_str else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"[Training] Using compute device: {device}")

    # 1. Load dataset manifest
    manifest_path = MANIFEST_DIR / "dataset_manifest.csv"
    if manifest_path.exists():
        manifest = pd.read_csv(manifest_path)
    else:
        manifest = build_dataset_manifest(BASE_DIR)

    split_rows = iter_rows_by_split(manifest)
    train_rows = split_rows["train"]
    dev_rows = split_rows["dev"]

    print(f"[Dataset] Train rows available: {len(train_rows)} | Dev rows: {len(dev_rows)}")

    # 2. Build Datasets
    train_dataset = AugmentedAudioDataset(train_rows, max_samples=max_train_samples, augment=True)
    dev_dataset = AugmentedAudioDataset(dev_rows, max_samples=max_dev_samples, augment=False)

    # 3. Compute Class Weights for balanced loss
    labels_list = [1.0 if r["label"] == "bonafide" else 0.0 for _, r in train_dataset.rows.iterrows()]
    bonafide_count = sum(labels_list)
    spoof_count = len(labels_list) - bonafide_count

    print(f"[Class Distribution] Bonafide: {bonafide_count} | Spoof: {spoof_count}")
    pos_weight_val = spoof_count / max(1.0, bonafide_count)
    pos_weight = torch.tensor([pos_weight_val], dtype=torch.float32, device=device)
    print(f"[Loss Balancing] pos_weight set to: {pos_weight_val:.4f}")

    # 4. Data Loaders
    sample_weights = [pos_weight_val if label == 1.0 else 1.0 for label in labels_list]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler)
    dev_loader = DataLoader(dev_dataset, batch_size=batch_size * 2, shuffle=False)

    # 5. Initialize Model, Loss, Optimizer & Scheduler
    model = AudioSpoofNet().to(device)
    criterion = nn.BCELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_dev_eer = 1.0
    best_state = None
    training_history = []
    start_train_time = time.time()

    for epoch in range(1, epochs + 1):
        model.train()
        total_loss = 0.0

        for features, batch_labels in train_loader:
            features = features.to(device)
            batch_labels = batch_labels.to(device)

            optimizer.zero_grad()
            outputs = model(features)
            loss = criterion(outputs, batch_labels)
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * len(batch_labels)

        scheduler.step()
        epoch_train_loss = total_loss / len(train_dataset)

        # Evaluate on validation split
        model.eval()
        all_probs = []
        all_labels = []

        with torch.no_grad():
            for features, batch_labels in dev_loader:
                features = features.to(device)
                outputs = model(features)
                all_probs.extend(outputs.cpu().numpy().tolist())
                all_labels.extend(batch_labels.cpu().numpy().tolist())

        all_probs = np.asarray(all_probs)
        all_labels = np.asarray(all_labels).astype(int)

        eer, opt_thresh = compute_eer(all_labels, all_probs)
        preds = (all_probs >= opt_thresh).astype(int)
        acc = accuracy_score(all_labels, preds)
        prec = precision_score(all_labels, preds, zero_division=0)
        rec = recall_score(all_labels, preds, zero_division=0)
        f1 = f1_score(all_labels, preds, zero_division=0)
        roc_auc = roc_auc_score(all_labels, all_probs) if len(np.unique(all_labels)) > 1 else 0.5

        epoch_stats = {
            "epoch": epoch,
            "train_loss": round(epoch_train_loss, 4),
            "val_accuracy": round(float(acc), 4),
            "val_precision": round(float(prec), 4),
            "val_recall": round(float(rec), 4),
            "val_f1": round(float(f1), 4),
            "val_roc_auc": round(float(roc_auc), 4),
            "val_eer": round(float(eer), 4),
            "optimal_threshold": round(float(opt_thresh), 4),
        }
        training_history.append(epoch_stats)

        print(
            f"Epoch {epoch}/{epochs} | Loss: {epoch_train_loss:.4f} | "
            f"Val Acc: {acc:.4f} | F1: {f1:.4f} | EER: {eer:.4f} | ROC-AUC: {roc_auc:.4f}"
        )

        if eer < best_dev_eer:
            best_dev_eer = eer
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

    total_time = time.time() - start_train_time
    print(f"\n[Training Completed] Total Time: {total_time:.2f}s | Best Dev EER: {best_dev_eer:.4f}")

    # Save Checkpoint & Metrics
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    if best_state is not None:
        torch.save(best_state, CHECKPOINT_DIR / "model.pt")

    summary = {
        "model_name": "AudioSpoofNet-Improved",
        "training_samples": len(train_dataset),
        "validation_samples": len(dev_dataset),
        "epochs": epochs,
        "total_training_time_seconds": round(total_time, 2),
        "best_dev_eer": round(float(best_dev_eer), 4),
        "history": training_history,
    }

    with open(CHECKPOINT_DIR / "training_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


if __name__ == "__main__":
    train_improved_model(epochs=50)
