"""
VoiceShield Fast 2x Epochs Retraining Pipeline
Pre-extracts all acoustic feature tensors (LFCC, Prosody, Waveform) into memory
for high-speed training across 2x epochs on CPU:
- LCNN: 10 epochs (LFCC)
- WavLM: 8 epochs (Waveform)
- BiLSTM: 8 epochs (Prosody)
- RawNet2: 8 epochs (Waveform)
"""
from __future__ import annotations

import json
import logging
import math
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, WeightedRandomSampler
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
    brier_score_loss,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import (
    LABEL_BONAFIDE,
    LABEL_SPOOF,
    TARGET_SR,
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_UNCERTAIN,
)
from voice_shield.features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from voice_shield.preprocessing import apply_audio_augmentation, extract_log_mel_spectrogram
from voice_shield.models import (
    LCNN,
    RawNet2,
    AASIST,
    WavLMClassifier,
    BiLSTMProsodyModel,
    ECAPATDNN,
    VoiceShieldRiskClassifier,
)
from voice_shield.models.calibration import ModelCalibrator, TemperatureScaling

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voiceshield.train_v2")

EXPERIMENTS_ROOT = ROOT_DIR / "experiments"
IMPROVED_MODEL_V2_DIR = EXPERIMENTS_ROOT / "improved_model_v2"
MODEL_ARTIFACTS = ROOT_DIR / "model_artifacts"
IMPROVED_MODEL_V2_DIR.mkdir(parents=True, exist_ok=True)
MODEL_ARTIFACTS.mkdir(parents=True, exist_ok=True)


def preload_waveforms(df: pd.DataFrame, desc: str = "Audio") -> Tuple[List[torch.Tensor], List[float]]:
    logger.info(f"Loading {len(df)} {desc} audio files into memory...")
    t0 = time.perf_counter()
    waveforms = []
    labels = []
    for idx, row in df.iterrows():
        p = row["path"]
        target = LABEL_BONAFIDE if "bona" in str(row["label"]).lower() else LABEL_SPOOF
        w = load_and_standardize_audio(p)
        waveforms.append(w)
        labels.append(target)
    elapsed = time.perf_counter() - t0
    logger.info(f"Loaded {len(waveforms)} waveforms in {elapsed:.2f}s ({elapsed/len(waveforms)*1000:.1f}ms/file)")
    return waveforms, labels


def pre_extract_features(waveforms: List[torch.Tensor], model_type: str) -> torch.Tensor:
    logger.info(f"Pre-extracting {model_type.upper()} features for {len(waveforms)} samples...")
    t0 = time.perf_counter()
    feats = []
    for w in waveforms:
        if model_type == "lcnn":
            f = extract_lfcc(w)  # [3, 20, T]
        elif model_type == "bilstm":
            f = extract_prosodic_features(w)  # [T, 8]
        else:
            f = w  # [64000]
        feats.append(f)
    tensor_feats = torch.stack(feats, dim=0)
    elapsed = time.perf_counter() - t0
    logger.info(f"Extracted {model_type.upper()} feature tensor {list(tensor_feats.shape)} in {elapsed:.2f}s")
    return tensor_feats


def compute_comprehensive_metrics(y_true: np.ndarray, y_probs: np.ndarray, threshold: float = 0.50) -> Dict[str, Any]:
    y_true = np.asarray(y_true).astype(int)
    y_probs = np.asarray(y_probs)
    y_pred = (y_probs >= threshold).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_probs))
    except Exception:
        auc = 0.5

    try:
        fpr, tpr, thresholds = roc_curve(y_true, y_probs, pos_label=1)
        fnr = 1.0 - tpr
        eer_idx = np.nanargmin(np.abs(fpr - fnr))
        eer = float(fpr[eer_idx])
        opt_thresh = float(thresholds[eer_idx])
    except Exception:
        eer = 0.5
        opt_thresh = 0.5

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    human_fpr = float(fn / max(1, fn + tp))  # Target 1 is bonafide
    spoof_recall = float(tn / max(1, tn + fp))  # Target 0 is spoof

    # Calibration error (ECE)
    n_bins = 10
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        in_bin = (y_probs >= bin_boundaries[i]) & (y_probs < bin_boundaries[i+1])
        prop = np.mean(in_bin)
        if prop > 0:
            bin_acc = np.mean(y_true[in_bin])
            bin_conf = np.mean(y_probs[in_bin])
            ece += np.abs(bin_conf - bin_acc) * prop

    return {
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(auc, 4),
        "eer": round(eer, 4),
        "optimal_threshold": round(opt_thresh, 4),
        "human_fpr": round(human_fpr, 4),
        "spoof_recall": round(spoof_recall, 4),
        "ece": round(float(ece), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def train_tensor_model(
    model: nn.Module,
    model_name: str,
    train_x: torch.Tensor,
    train_y: torch.Tensor,
    dev_x: torch.Tensor,
    dev_y: torch.Tensor,
    epochs: int = 10,
    batch_size: int = 32,
    lr: float = 1e-3,
    device: str = "cpu",
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    logger.info(f"=== Training Model: {model_name} for {epochs} EPOCHS (2x) on {device.upper()} ===")
    model = model.to(device)

    # Class balance weights
    num_bonafide = max(1, int(torch.sum(train_y == LABEL_BONAFIDE).item()))
    num_spoof = max(1, len(train_y) - num_bonafide)
    w_bona = 1.0 / num_bonafide
    w_spoof = 1.0 / num_spoof
    sample_weights = torch.tensor([w_bona if y == LABEL_BONAFIDE else w_spoof for y in train_y], dtype=torch.float32)

    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=batch_size, sampler=sampler)
    dev_loader = DataLoader(TensorDataset(dev_x, dev_y), batch_size=batch_size, shuffle=False)

    criterion = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([1.2]).to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_score = -float("inf")
    best_weights = None
    best_metrics = {}
    history = []

    for epoch in range(1, epochs + 1):
        model.train()
        train_loss = 0.0
        t0_ep = time.perf_counter()
        for x, y in train_loader:
            x = x.to(device)
            y = y.to(device)
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
        val_targets = []
        val_probs = []
        val_logits = []
        with torch.no_grad():
            for x, y in dev_loader:
                x = x.to(device)
                logits = model(x, return_logits=True)
                probs = torch.sigmoid(logits).cpu().numpy()
                val_probs.extend(probs)
                val_logits.extend(logits.cpu().numpy())
                val_targets.extend(y.numpy())

        ep_duration = time.perf_counter() - t0_ep
        metrics = compute_comprehensive_metrics(np.array(val_targets), np.array(val_probs))
        logger.info(
            f"[{model_name}] Epoch {epoch:02d}/{epochs:02d} ({ep_duration:.2f}s) | Train Loss: {train_loss:.4f} | "
            f"Bal Acc: {metrics['balanced_accuracy']:.4f} | AUC: {metrics['roc_auc']:.4f} | "
            f"EER: {metrics['eer']:.4f} | Human FPR: {metrics['human_fpr']:.4f} | Spoof Rec: {metrics['spoof_recall']:.4f} | F1: {metrics['f1']:.4f}"
        )
        history.append({
            "epoch": epoch,
            "train_loss": round(train_loss, 4),
            **metrics,
        })

        # Selection criterion: optimize F1 with human FPR control
        selection_score = metrics["f1"] - (0.4 * metrics["human_fpr"])
        if selection_score >= best_score:
            best_score = selection_score
            best_metrics = metrics
            best_weights = {k: v.cpu().clone() for k, v in model.state_dict().items()}

    if best_weights:
        model.load_state_dict(best_weights)

    return best_metrics, {
        "history": history,
        "best_weights": best_weights,
        "val_logits": np.array(val_logits),
        "val_targets": np.array(val_targets),
        "val_probs": np.array(val_probs),
    }


def main():
    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    if not manifest_path.exists():
        logger.error(f"Manifest not found: {manifest_path}")
        return

    df = pd.read_csv(manifest_path)
    logger.info(f"Loaded {len(df)} records from speaker-disjoint manifest.")

    # 1. Balanced Train and Dev subsets (1000 train per class = 2000 total, 300 dev per class = 600 total)
    train_bona = df[(df["split"] == "train") & (df["label"] == "bonafide")].sample(min(1000, len(df[(df["split"] == "train") & (df["label"] == "bonafide")])), random_state=42)
    train_spoof = df[(df["split"] == "train") & (df["label"] == "spoof")].sample(min(1000, len(df[(df["split"] == "train") & (df["label"] == "spoof")])), random_state=42)
    train_df = pd.concat([train_bona, train_spoof]).sample(frac=1.0, random_state=42)

    dev_bona = df[(df["split"] == "dev") & (df["label"] == "bonafide")].sample(min(300, len(df[(df["split"] == "dev") & (df["label"] == "bonafide")])), random_state=42)
    dev_spoof = df[(df["split"] == "dev") & (df["label"] == "spoof")].sample(min(300, len(df[(df["split"] == "dev") & (df["label"] == "spoof")])), random_state=42)
    dev_df = pd.concat([dev_bona, dev_spoof]).sample(frac=1.0, random_state=42)

    logger.info(f"Selected Train Set: {len(train_df)} | Dev Set: {len(dev_df)}")

    # Preload raw waveforms into memory
    train_waves, train_labels_list = preload_waveforms(train_df, desc="Train")
    dev_waves, dev_labels_list = preload_waveforms(dev_df, desc="Dev")

    train_y = torch.tensor(train_labels_list, dtype=torch.float32)
    dev_y = torch.tensor(dev_labels_list, dtype=torch.float32)

    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Pre-extract LFCC features for LCNN
    train_lfcc = pre_extract_features(train_waves, "lcnn")
    dev_lfcc = pre_extract_features(dev_waves, "lcnn")

    # Pre-extract Prosody features for BiLSTM
    train_prosody = pre_extract_features(train_waves, "bilstm")
    dev_prosody = pre_extract_features(dev_waves, "bilstm")

    # Raw Waveform tensors for WavLM & RawNet2
    train_raw = torch.stack(train_waves, dim=0)
    dev_raw = torch.stack(dev_waves, dim=0)

    # Set optimal CPU parallelism
    num_threads = min(8, os.cpu_count() or 4)
    torch.set_num_threads(num_threads)
    logger.info(f"Using {num_threads} CPU threads for tensor operations.")

    # 1. Train LCNN + LFCC for 10 Epochs (2x previous 5 epochs)
    lcnn = LCNN(in_channels=3, num_classes=1)
    lcnn_metrics, lcnn_artifacts = train_tensor_model(lcnn, "lcnn", train_lfcc, train_y, dev_lfcc, dev_y, epochs=10, batch_size=32, lr=1e-3, device=device)
    if lcnn_artifacts["best_weights"]:
        torch.save(lcnn_artifacts["best_weights"], IMPROVED_MODEL_V2_DIR / "model.pt")
        torch.save(lcnn_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "model.pt")
        torch.save(lcnn_artifacts["best_weights"], EXPERIMENTS_ROOT / "lcnn_lfcc" / "model.pt")
        logger.info("Saved LCNN champion weights.")

    # 2. Train WavLM Head for 8 Epochs (2x previous 4 epochs)
    wavlm = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4, num_classes=1)
    wavlm_metrics, wavlm_artifacts = train_tensor_model(wavlm, "wavlm", train_raw, train_y, dev_raw, dev_y, epochs=8, batch_size=32, lr=5e-4, device=device)
    if wavlm_artifacts["best_weights"]:
        torch.save(wavlm_artifacts["best_weights"], IMPROVED_MODEL_V2_DIR / "wavlm.pt")
        torch.save(wavlm_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "wavlm.pt")
        torch.save(wavlm_artifacts["best_weights"], EXPERIMENTS_ROOT / "wavlm" / "model.pt")
        logger.info("Saved WavLM champion weights.")

    # 3. Train BiLSTM Prosodic Tracker for 8 Epochs (2x previous 4 epochs)
    bilstm = BiLSTMProsodyModel(in_features=8, hidden_dim=64, num_layers=2, num_classes=1)
    bilstm_metrics, bilstm_artifacts = train_tensor_model(bilstm, "bilstm_prosody", train_prosody, train_y, dev_prosody, dev_y, epochs=8, batch_size=32, lr=1e-3, device=device)
    if bilstm_artifacts["best_weights"]:
        torch.save(bilstm_artifacts["best_weights"], IMPROVED_MODEL_V2_DIR / "bilstm.pt")
        torch.save(bilstm_artifacts["best_weights"], EXPERIMENTS_ROOT / "improved_model" / "bilstm.pt")
        torch.save(bilstm_artifacts["best_weights"], EXPERIMENTS_ROOT / "bilstm_prosody" / "model.pt")
        logger.info("Saved BiLSTM champion weights.")

    # 4. Train RawNet2 for 8 Epochs
    rawnet2 = RawNet2(sinc_channels=64, num_classes=1)
    rawnet2_metrics, rawnet2_artifacts = train_tensor_model(rawnet2, "rawnet2", train_raw, train_y, dev_raw, dev_y, epochs=8, batch_size=32, lr=5e-4, device=device)
    if rawnet2_artifacts["best_weights"]:
        torch.save(rawnet2_artifacts["best_weights"], IMPROVED_MODEL_V2_DIR / "rawnet2.pt")
        torch.save(rawnet2_artifacts["best_weights"], EXPERIMENTS_ROOT / "rawnet2" / "model.pt")
        logger.info("Saved RawNet2 champion weights.")

    # Fit Probability Calibration on Validation Set
    calibrator = ModelCalibrator()
    calib_results = calibrator.fit(lcnn_artifacts["val_logits"], lcnn_artifacts["val_targets"])
    logger.info(f"Fitted Calibration Results on Dev Set: {calib_results}")

    # Save calibration artifact
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

    # Save Experiment Telemetry
    config = {
        "model_champion": "VoiceShield-v2.2.0-Ensemble-2xEpochs",
        "submodels": ["LCNN+LFCC (10 epochs)", "WavLM Head (8 epochs)", "BiLSTM Prosody (8 epochs)", "RawNet2 (8 epochs)"],
        "training_samples": len(train_df),
        "validation_samples": len(dev_df),
        "epochs": {
            "lcnn": 10,
            "wavlm": 8,
            "bilstm": 8,
            "rawnet2": 8,
        },
        "calibration": calib_results,
        "device": device,
    }

    metrics_summary = {
        "lcnn": lcnn_metrics,
        "wavlm": wavlm_metrics,
        "bilstm": bilstm_metrics,
        "rawnet2": rawnet2_metrics,
    }

    with open(IMPROVED_MODEL_V2_DIR / "config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    with open(IMPROVED_MODEL_V2_DIR / "metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    with open(IMPROVED_MODEL_V2_DIR / "training_history.json", "w", encoding="utf-8") as f:
        json.dump({
            "lcnn": lcnn_artifacts["history"],
            "wavlm": wavlm_artifacts["history"],
            "bilstm": bilstm_artifacts["history"],
            "rawnet2": rawnet2_artifacts["history"],
        }, f, indent=2)

    logger.info("=" * 80)
    logger.info("2X EPOCH MULTI-MODEL RETRAINING & CALIBRATION COMPLETE!")
    logger.info(f"Saved artifacts to {IMPROVED_MODEL_V2_DIR}")
    logger.info("=" * 80)


if __name__ == "__main__":
    main()
