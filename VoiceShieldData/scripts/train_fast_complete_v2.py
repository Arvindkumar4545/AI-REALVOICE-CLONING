"""
VoiceShield Fast Complete 2x Epoch Retraining & Calibration Pipeline
- Uses preloaded RAM waveforms and vectorized tensor batches
- Multi-core CPU acceleration (8 threads)
- Trains 2x epochs across all sub-models:
  * LCNN: 10 epochs (checks existing or retrains)
  * BiLSTM: 8 epochs
  * WavLM: 8 epochs
  * RawNet2: 8 epochs
- Fits temperature & Platt probability calibration on held-out Dev logits
- Saves all model checkpoints to experiments/improved_model_v2 and experiments/improved_model
"""
from __future__ import annotations

import gc
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset, WeightedRandomSampler

ROOT_DIR = Path("F:/VoiceShieldData")
sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import LABEL_BONAFIDE, LABEL_SPOOF, TARGET_SR
from voice_shield.features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from voice_shield.models.lcnn import LCNN
from voice_shield.models.wavlm_head import WavLMClassifier
from voice_shield.models.bilstm_prosody import BiLSTMProsodyModel
from voice_shield.models.rawnet2 import RawNet2
from voice_shield.models.calibration import ModelCalibrator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(ROOT_DIR / "experiments" / "train_2x_epochs.log", mode="w", encoding="utf-8"),
    ],
)
logger = logging.getLogger("voiceshield.train2x")

EXPERIMENTS_ROOT = ROOT_DIR / "experiments"
IMPROVED_MODEL_V2_DIR = EXPERIMENTS_ROOT / "improved_model_v2"
IMPROVED_MODEL_DIR = EXPERIMENTS_ROOT / "improved_model"
MODEL_ARTIFACTS = ROOT_DIR / "model_artifacts"


def safe_save(weights: Any, path: Path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(weights, path)
    logger.info(f"Saved checkpoint -> {path}")


def compute_metrics(y_true: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    from sklearn.metrics import roc_auc_score, precision_recall_fscore_support, accuracy_score, balanced_accuracy_score

    y_is_spoof = (y_true == LABEL_SPOOF).astype(int)
    y_is_bona = (y_true == LABEL_BONAFIDE).astype(int)
    spoof_prob = np.clip(1.0 - y_prob, 1e-7, 1.0 - 1e-7)

    acc = float(accuracy_score(y_is_spoof, spoof_prob >= 0.5))
    bal_acc = float(balanced_accuracy_score(y_is_spoof, spoof_prob >= 0.5))
    auc = float(roc_auc_score(y_is_spoof, spoof_prob)) if len(np.unique(y_is_spoof)) > 1 else 0.5

    # Compute EER
    thresholds = np.linspace(0.0, 1.0, 501)
    eer = 0.5
    min_diff = float("inf")
    opt_thresh = 0.5
    for t in thresholds:
        fpr = np.mean((spoof_prob >= t) & (y_is_bona == 1)) / max(1e-6, np.mean(y_is_bona == 1))
        fnr = np.mean((spoof_prob < t) & (y_is_spoof == 1)) / max(1e-6, np.mean(y_is_spoof == 1))
        if abs(fpr - fnr) < min_diff:
            min_diff = abs(fpr - fnr)
            eer = (fpr + fnr) / 2.0
            opt_thresh = t

    prec, rec, f1, _ = precision_recall_fscore_support(y_is_spoof, spoof_prob >= 0.5, average="binary", zero_division=0)
    human_fpr = float(np.mean((spoof_prob >= 0.5) & (y_is_bona == 1)) / max(1e-6, np.mean(y_is_bona == 1)))
    spoof_recall = float(np.mean((spoof_prob >= 0.5) & (y_is_spoof == 1)) / max(1e-6, np.mean(y_is_spoof == 1)))

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "roc_auc": round(auc, 4),
        "eer": round(float(eer), 4),
        "optimal_threshold": round(float(opt_thresh), 4),
        "human_fpr": round(human_fpr, 4),
        "spoof_recall": round(spoof_recall, 4),
    }


def train_model(
    model: nn.Module,
    model_name: str,
    train_x: torch.Tensor,
    train_y: torch.Tensor,
    dev_x: torch.Tensor,
    dev_y: torch.Tensor,
    epochs: int,
    batch_size: int = 64,
    lr: float = 1e-3,
    save_path: Path = None,
) -> Tuple[Dict[str, float], Dict[str, Any]]:
    logger.info(f"=== Training {model_name.upper()} ({epochs} Epochs) ===")
    num_bonafide = max(1, int(torch.sum(train_y == LABEL_BONAFIDE).item()))
    num_spoof = max(1, len(train_y) - num_bonafide)
    sample_weights = torch.tensor([1.0 / num_bonafide if y == LABEL_BONAFIDE else 1.0 / num_spoof for y in train_y], dtype=torch.float32)
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=batch_size, sampler=sampler)
    dev_loader = DataLoader(TensorDataset(dev_x, dev_y), batch_size=batch_size, shuffle=False)

    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_score = -float("inf")
    best_weights = None
    best_metrics = {}
    history = []

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        t0 = time.perf_counter()
        for x, y in train_loader:
            optimizer.zero_grad()
            logits = model(x, return_logits=True)
            loss = criterion(logits, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_loss += loss.item() * len(y)

        train_loss /= len(train_x)
        scheduler.step()

        # Validation
        model.eval()
        val_targets, val_probs, val_logits = [], [], []
        with torch.no_grad():
            for x, y in dev_loader:
                logits = model(x, return_logits=True)
                probs = torch.sigmoid(logits).cpu().numpy()
                val_probs.extend(probs)
                val_logits.extend(logits.cpu().numpy())
                val_targets.extend(y.numpy())

        ep_duration = time.perf_counter() - t0
        metrics = compute_metrics(np.array(val_targets), np.array(val_probs))
        logger.info(
            f"[{model_name}] Epoch {epoch:02d}/{epochs:02d} ({ep_duration:.2f}s) | Train Loss: {train_loss:.4f} | "
            f"Bal Acc: {metrics['balanced_accuracy']:.4f} | AUC: {metrics['roc_auc']:.4f} | "
            f"EER: {metrics['eer']:.4f} | Human FPR: {metrics['human_fpr']:.4f} | Spoof Rec: {metrics['spoof_recall']:.4f} | F1: {metrics['f1']:.4f}"
        )
        history.append({"epoch": epoch, "train_loss": round(train_loss, 4), **metrics})

        selection_score = metrics["roc_auc"] + metrics["spoof_recall"] - (0.5 * metrics["human_fpr"])
        if selection_score >= best_score:
            best_score = selection_score
            best_metrics = metrics
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            if save_path:
                safe_save(best_weights, save_path)

    return best_metrics, {
        "history": history,
        "best_weights": best_weights,
        "val_logits": np.array(val_logits),
        "val_targets": np.array(val_targets),
        "val_probs": np.array(val_probs),
    }


def main():
    torch.set_num_threads(min(8, os.cpu_count() or 4))
    logger.info(f"Using {torch.get_num_threads()} CPU threads.")

    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    df = pd.read_csv(manifest_path)

    # 1. Balanced Subsets (1000 train per class, 300 dev per class)
    train_bona = df[(df["split"] == "train") & (df["label"] == "bonafide")].sample(1000, random_state=42)
    train_spoof = df[(df["split"] == "train") & (df["label"] == "spoof")].sample(1000, random_state=42)
    train_df = pd.concat([train_bona, train_spoof]).sample(frac=1.0, random_state=42)

    dev_bona = df[(df["split"] == "dev") & (df["label"] == "bonafide")].sample(300, random_state=42)
    dev_spoof = df[(df["split"] == "dev") & (df["label"] == "spoof")].sample(300, random_state=42)
    dev_df = pd.concat([dev_bona, dev_spoof]).sample(frac=1.0, random_state=42)

    logger.info(f"Selected Train: {len(train_df)} | Dev: {len(dev_df)}")

    # Preload Audio
    train_waves, train_labels = [], []
    for _, row in train_df.iterrows():
        p = row["path"]
        w = load_and_standardize_audio(p)
        train_waves.append(w)
        train_labels.append(LABEL_BONAFIDE if "bona" in str(row["label"]).lower() else LABEL_SPOOF)

    dev_waves, dev_labels = [], []
    for _, row in dev_df.iterrows():
        p = row["path"]
        w = load_and_standardize_audio(p)
        dev_waves.append(w)
        dev_labels.append(LABEL_BONAFIDE if "bona" in str(row["label"]).lower() else LABEL_SPOOF)

    train_y = torch.tensor(train_labels, dtype=torch.float32)
    dev_y = torch.tensor(dev_labels, dtype=torch.float32)
    train_raw = torch.stack(train_waves, dim=0)
    dev_raw = torch.stack(dev_waves, dim=0)

    # 1. Check LCNN Checkpoint or Retrain (10 Epochs)
    lcnn_path = IMPROVED_MODEL_V2_DIR / "model.pt"
    lcnn = LCNN(in_channels=3, num_classes=1)
    if lcnn_path.exists():
        logger.info(f"Found existing 10-Epoch LCNN Champion: {lcnn_path}")
        lcnn.load_state_dict(torch.load(lcnn_path, map_location="cpu"))
        lcnn.eval()
        dev_lfcc = torch.stack([extract_lfcc(w, TARGET_SR) for w in dev_waves], dim=0)
        with torch.no_grad():
            dev_logits = lcnn(dev_lfcc, return_logits=True).numpy()
            dev_probs = torch.sigmoid(torch.from_numpy(dev_logits)).numpy()
        lcnn_metrics = compute_metrics(dev_y.numpy(), dev_probs)
        lcnn_artifacts = {"val_logits": dev_logits, "val_targets": dev_y.numpy(), "best_weights": lcnn.state_dict()}
        logger.info(f"LCNN Champion Verified Dev AUC: {lcnn_metrics['roc_auc']:.4f} | EER: {lcnn_metrics['eer']:.4f} | Spoof Rec: {lcnn_metrics['spoof_recall']:.4f}")
    else:
        logger.info("Extracting LFCC features for LCNN...")
        train_lfcc = torch.stack([extract_lfcc(w, TARGET_SR) for w in train_waves], dim=0)
        dev_lfcc = torch.stack([extract_lfcc(w, TARGET_SR) for w in dev_waves], dim=0)
        lcnn_metrics, lcnn_artifacts = train_model(lcnn, "lcnn", train_lfcc, train_y, dev_lfcc, dev_y, epochs=10, batch_size=32, lr=1e-3, save_path=lcnn_path)

    # Copy to improved_model
    safe_save(lcnn_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "model.pt")
    safe_save(lcnn_artifacts["best_weights"], EXPERIMENTS_ROOT / "lcnn_lfcc" / "model.pt")
    gc.collect()

    # 2. Check / Train BiLSTM Prosodic Tracker (8 Epochs)
    bilstm_path = IMPROVED_MODEL_V2_DIR / "bilstm.pt"
    bilstm = BiLSTMProsodyModel(in_features=8, hidden_dim=64, num_layers=2, num_classes=1)
    if bilstm_path.exists():
        logger.info(f"Found existing 8-Epoch BiLSTM Champion: {bilstm_path}")
        bilstm.load_state_dict(torch.load(bilstm_path, map_location="cpu"))
        bilstm.eval()
        dev_prosody = torch.stack([extract_prosodic_features(w, TARGET_SR) for w in dev_waves], dim=0)
        with torch.no_grad():
            dev_logits = bilstm(dev_prosody, return_logits=True).numpy()
            dev_probs = torch.sigmoid(torch.from_numpy(dev_logits)).numpy()
        bilstm_metrics = compute_metrics(dev_y.numpy(), dev_probs)
        bilstm_artifacts = {"val_logits": dev_logits, "val_targets": dev_y.numpy(), "best_weights": bilstm.state_dict()}
        logger.info(f"BiLSTM Champion Verified Dev AUC: {bilstm_metrics['roc_auc']:.4f} | EER: {bilstm_metrics['eer']:.4f} | Spoof Rec: {bilstm_metrics['spoof_recall']:.4f}")
    else:
        logger.info("Extracting Prosodic features for BiLSTM...")
        train_prosody = torch.stack([extract_prosodic_features(w, TARGET_SR) for w in train_waves], dim=0)
        dev_prosody = torch.stack([extract_prosodic_features(w, TARGET_SR) for w in dev_waves], dim=0)
        bilstm_metrics, bilstm_artifacts = train_model(bilstm, "bilstm_prosody", train_prosody, train_y, dev_prosody, dev_y, epochs=8, batch_size=32, lr=1e-3, save_path=bilstm_path)
    safe_save(bilstm_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "bilstm.pt")
    safe_save(bilstm_artifacts["best_weights"], EXPERIMENTS_ROOT / "bilstm_prosody" / "model.pt")
    gc.collect()

    # 3. Train WavLM Head (8 Epochs, batch size 64 for fast execution)
    wavlm_path = IMPROVED_MODEL_V2_DIR / "wavlm.pt"
    wavlm = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4, num_classes=1)
    if wavlm_path.exists():
        logger.info(f"Found existing WavLM Champion: {wavlm_path}")
        wavlm.load_state_dict(torch.load(wavlm_path, map_location="cpu"))
        wavlm.eval()
        with torch.no_grad():
            dev_logits = wavlm(dev_raw, return_logits=True).numpy()
            dev_probs = torch.sigmoid(torch.from_numpy(dev_logits)).numpy()
        wavlm_metrics = compute_metrics(dev_y.numpy(), dev_probs)
        wavlm_artifacts = {"val_logits": dev_logits, "val_targets": dev_y.numpy(), "best_weights": wavlm.state_dict()}
    else:
        wavlm_metrics, wavlm_artifacts = train_model(wavlm, "wavlm", train_raw, train_y, dev_raw, dev_y, epochs=8, batch_size=32, lr=5e-4, save_path=wavlm_path)
    safe_save(wavlm_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "wavlm.pt")
    safe_save(wavlm_artifacts["best_weights"], EXPERIMENTS_ROOT / "wavlm" / "model.pt")
    gc.collect()

    # 4. Train RawNet2 (8 Epochs, batch size 64)
    rawnet2_path = IMPROVED_MODEL_V2_DIR / "rawnet2.pt"
    rawnet2 = RawNet2(sinc_channels=64, num_classes=1)
    if rawnet2_path.exists():
        logger.info(f"Found existing RawNet2 Champion: {rawnet2_path}")
        rawnet2.load_state_dict(torch.load(rawnet2_path, map_location="cpu"))
        rawnet2.eval()
        with torch.no_grad():
            dev_logits = rawnet2(dev_raw, return_logits=True).numpy()
            dev_probs = torch.sigmoid(torch.from_numpy(dev_logits)).numpy()
        rawnet2_metrics = compute_metrics(dev_y.numpy(), dev_probs)
        rawnet2_artifacts = {"val_logits": dev_logits, "val_targets": dev_y.numpy(), "best_weights": rawnet2.state_dict()}
    else:
        rawnet2_metrics, rawnet2_artifacts = train_model(rawnet2, "rawnet2", train_raw, train_y, dev_raw, dev_y, epochs=8, batch_size=32, lr=5e-4, save_path=rawnet2_path)
    safe_save(rawnet2_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "rawnet2.pt")
    safe_save(rawnet2_artifacts["best_weights"], EXPERIMENTS_ROOT / "rawnet2" / "model.pt")
    gc.collect()

    # 5. Fit Probability Calibration on Validation Set
    calibrator = ModelCalibrator()
    calib_results = calibrator.fit(lcnn_artifacts["val_logits"], lcnn_artifacts["val_targets"])
    logger.info(f"Fitted Calibration Results on Dev Set: {calib_results}")

    calib_file = MODEL_ARTIFACTS / "calibration.json"
    with open(calib_file, "w", encoding="utf-8") as f:
        json.dump({
            "threshold": 0.50,
            "threshold_lower": 0.35,
            "threshold_upper": 0.65,
            "method": "Speaker-Disjoint-Calibrated-Dev-2xEpochs",
            "calibration_method": calib_results["best_calibration_method"],
            "temperature_scalar": calib_results["temperature_scalar"],
            "brier_score_calibrated": calib_results["brier_score_calibrated"],
            "risk_tiers": {
                "low": [0.0, 25.0],
                "moderate": [25.0, 50.0],
                "high": [50.0, 75.0],
                "critical": [75.0, 100.0],
            },
        }, f, indent=2)
    logger.info(f"Saved calibration artifact -> {calib_file}")

    # Summary Report
    summary = {
        "lcnn": lcnn_metrics,
        "bilstm": bilstm_metrics,
        "wavlm": wavlm_metrics,
        "rawnet2": rawnet2_metrics,
        "calibration": calib_results,
    }
    with open(EXPERIMENTS_ROOT / "training_summary_2x_epochs.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    logger.info("=" * 60)
    logger.info("2X EPOCH RETRAINING & CALIBRATION COMPLETE!")
    logger.info(f"LCNN Dev AUC: {lcnn_metrics['roc_auc']:.4f} | EER: {lcnn_metrics['eer']:.4f} | Spoof Recall: {lcnn_metrics['spoof_recall']:.4f}")
    logger.info(f"BiLSTM Dev AUC: {bilstm_metrics['roc_auc']:.4f} | EER: {bilstm_metrics['eer']:.4f} | Spoof Recall: {bilstm_metrics['spoof_recall']:.4f}")
    logger.info(f"WavLM Dev AUC: {wavlm_metrics['roc_auc']:.4f} | EER: {wavlm_metrics['eer']:.4f} | Spoof Recall: {wavlm_metrics['spoof_recall']:.4f}")
    logger.info(f"RawNet2 Dev AUC: {rawnet2_metrics['roc_auc']:.4f} | EER: {rawnet2_metrics['eer']:.4f} | Spoof Recall: {rawnet2_metrics['spoof_recall']:.4f}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
