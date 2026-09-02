"""
Comprehensive Evaluation Pipeline for VoiceShield Models
Calculates Accuracy, Precision, Recall, F1, ROC-AUC, EER, FAR, FRR, and Confusion Matrix.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Any

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
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
from voice_shield.dataset import BASE_DIR, iter_rows_by_split
from voice_shield.train import AudioDataset

DEFAULT_MODEL_PATH = BASE_DIR / "models" / "voiceshield_best" / "model.pt"
REPORTS_DIR = BASE_DIR / "reports"
MANIFEST_PATH = BASE_DIR / "manifests" / "dataset_manifest.csv"


def compute_eer(labels: np.ndarray, scores: np.ndarray):
    fpr, tpr, thresholds = roc_curve(labels, scores, pos_label=1)
    fnr = 1 - tpr
    eer = float(brentq(lambda x: 1.0 - x - interp1d(fpr, tpr)(x), 0.0, 1.0))
    optimal_idx = np.nanargmin(np.abs(fnr - fpr))
    return eer, thresholds[optimal_idx], fpr[optimal_idx], fnr[optimal_idx]


def evaluate_checkpoint(
    model_path: str | Path = DEFAULT_MODEL_PATH,
    max_eval_samples: int = 1500,
    batch_size: int = 64,
) -> Dict[str, Any]:
    model_path = Path(model_path)
    print(f"[Evaluation] Evaluating checkpoint: {model_path}")

    if not model_path.exists():
        raise FileNotFoundError(f"Model checkpoint not found: {model_path}")

    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found: {MANIFEST_PATH}")

    manifest = pd.read_csv(MANIFEST_PATH)
    split_rows = iter_rows_by_split(manifest)
    eval_rows = split_rows["eval"] if not split_rows["eval"].empty else split_rows["dev"]

    print(f"[Evaluation] Test samples available: {len(eval_rows)}")
    eval_dataset = AudioDataset(eval_rows, max_samples=max_eval_samples)
    eval_loader = DataLoader(eval_dataset, batch_size=batch_size, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AudioSpoofNet().to(device)
    state = torch.load(str(model_path), map_location=device)
    model.load_state_dict(state)
    model.eval()

    all_probs = []
    all_labels = []

    with torch.no_grad():
        for features, labels in eval_loader:
            features = features.to(device)
            outputs = model(features)
            all_probs.extend(outputs.cpu().numpy().tolist())
            all_labels.extend(labels.cpu().numpy().tolist())

    all_probs = np.asarray(all_probs)
    all_labels = np.asarray(all_labels).astype(int)

    # Calculate metrics
    eer, opt_thresh, far, frr = compute_eer(all_labels, all_probs)
    preds = (all_probs >= 0.5).astype(int)
    opt_preds = (all_probs >= opt_thresh).astype(int)

    cm = confusion_matrix(all_labels, preds).tolist()
    opt_cm = confusion_matrix(all_labels, opt_preds).tolist()

    report = {
        "model_path": str(model_path),
        "total_eval_samples": len(eval_dataset),
        "accuracy_threshold_0.5": round(float(accuracy_score(all_labels, preds)), 4),
        "precision_threshold_0.5": round(float(precision_score(all_labels, preds, zero_division=0)), 4),
        "recall_threshold_0.5": round(float(recall_score(all_labels, preds, zero_division=0)), 4),
        "f1_threshold_0.5": round(float(f1_score(all_labels, preds, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(all_labels, all_probs)), 4) if len(np.unique(all_labels)) > 1 else 0.5,
        "eer": round(float(eer), 4),
        "optimal_threshold": round(float(opt_thresh), 4),
        "far_at_eer": round(float(far), 4),
        "frr_at_eer": round(float(frr), 4),
        "optimal_accuracy": round(float(accuracy_score(all_labels, opt_preds)), 4),
        "optimal_f1": round(float(f1_score(all_labels, opt_preds, zero_division=0)), 4),
        "confusion_matrix_0.5": cm,
        "confusion_matrix_optimal": opt_cm,
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_file = REPORTS_DIR / f"evaluation_report_{model_path.stem}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 50)
    print("       VOICE SHIELD EVALUATION METRICS REPORT        ")
    print("=" * 50)
    print(f"Accuracy (thresh 0.50): {report['accuracy_threshold_0.5'] * 100:.2f}%")
    print(f"Precision:              {report['precision_threshold_0.5']:.4f}")
    print(f"Recall:                 {report['recall_threshold_0.5']:.4f}")
    print(f"F1 Score:               {report['f1_threshold_0.5']:.4f}")
    print(f"ROC-AUC:                {report['roc_auc']:.4f}")
    print(f"Equal Error Rate (EER): {report['eer'] * 100:.2f}%")
    print(f"Optimal Threshold:      {report['optimal_threshold']:.4f}")
    print(f"Optimal F1 Score:       {report['optimal_f1']:.4f}")
    print("=" * 50 + "\n")

    return report


if __name__ == "__main__":
    evaluate_checkpoint()
