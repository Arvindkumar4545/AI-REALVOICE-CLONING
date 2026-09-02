"""
VoiceShield Formal Model Evaluation Pipeline (Phase 15)
Calculates:
1. Binary Metrics at Operating Point (Risk Threshold >= 35.0 / Calibrated Prob >= 0.35)
2. 3-State Metrics (BONA_FIDE, UNCERTAIN, SPOOF)
3. ROC Curve, ROC-AUC, PR-AUC, and Equal Error Rate (EER)
4. Calibration Brier Loss and ECE
5. Human False Positive Rate & Spoof False Negative Rate

Saves structured results to evaluation/results/evaluation_metrics.json
"""
from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    precision_recall_curve,
    auc,
    confusion_matrix,
    brier_score_loss,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import VoiceShieldInferenceEngine
from voice_shield.constants import CLASS_BONAFIDE, CLASS_SPOOF, CLASS_UNCERTAIN, CLASS_INSUFFICIENT

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voiceshield.evaluate_model")


def binary_prediction_from_classification(classification: str) -> int:
    """Map the 3-state decision policy to strict binary semantics: UNCERTAIN is not spoof."""
    return 1 if str(classification).upper() == CLASS_SPOOF else 0


def compute_eer(y_true: np.ndarray, y_score: np.ndarray) -> Tuple[float, float]:
    from sklearn.metrics import roc_curve
    fpr, tpr, thresholds = roc_curve(y_true, y_score, pos_label=1)
    fnr = 1.0 - tpr
    idx = np.nanargmin(np.absolute((fnr - fpr)))
    eer = (fpr[idx] + fnr[idx]) / 2.0
    return float(eer), float(thresholds[idx])


def compute_ece(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        bin_idx = np.where((y_prob > bin_boundaries[i]) & (y_prob <= bin_boundaries[i + 1]))[0]
        if len(bin_idx) > 0:
            prop_in_bin = len(bin_idx) / len(y_prob)
            acc_in_bin = np.mean(y_true[bin_idx] == (y_prob[bin_idx] >= 0.5))
            conf_in_bin = np.mean(y_prob[bin_idx])
            ece += prop_in_bin * np.abs(acc_in_bin - conf_in_bin)
    return float(ece)


def run_full_evaluation(num_samples: int = 35) -> Dict[str, Any]:
    meta_path = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    audio_dir = meta_path.parent
    if not meta_path.exists():
        logger.error(f"Metadata file not found: {meta_path}")
        return {}

    df = pd.read_csv(meta_path)
    human_df = df[df["label"].str.lower().str.contains("bona")].head(num_samples)
    spoof_df = df[df["label"].str.lower().str.contains("spoof")].head(num_samples)

    logger.info(f"Evaluating {len(human_df)} Real Human samples and {len(spoof_df)} Real Spoof samples...")
    engine = VoiceShieldInferenceEngine.get_instance()

    y_true = []  # 0 for bona fide, 1 for spoof
    y_prob = []  # calibrated spoof probability (0.0 to 1.0)
    risk_scores = []
    classifications = []

    # Human evaluation (ground truth = 0)
    for _, row in human_df.iterrows():
        fpath = audio_dir / row["file"]
        if not fpath.exists():
            continue
        res = engine.detect(str(fpath))
        if res["classification"] == CLASS_INSUFFICIENT:
            continue
        prob_spoof = float(res.get("spoof_probability", res.get("probability", 0.0) or 0.0))
        y_true.append(0)
        y_prob.append(prob_spoof)
        risk_scores.append(res["risk_score"])
        classifications.append(res["classification"])

    # Spoof evaluation (ground truth = 1)
    for _, row in spoof_df.iterrows():
        fpath = audio_dir / row["file"]
        if not fpath.exists():
            continue
        res = engine.detect(str(fpath))
        if res["classification"] == CLASS_INSUFFICIENT:
            continue
        prob_spoof = float(res.get("spoof_probability", res.get("probability", 0.0) or 0.0))
        y_true.append(1)
        y_prob.append(prob_spoof)
        risk_scores.append(res["risk_score"])
        classifications.append(res["classification"])

    y_true_arr = np.array(y_true)
    y_prob_arr = np.array(y_prob)

    # Decision semantics: a 3-state engine treats UNCERTAIN as non-spoof for binary evaluation.
    operating_threshold = 0.35
    y_pred_arr = np.array([binary_prediction_from_classification(c) for c in classifications], dtype=int)

    # Core Metrics
    acc = accuracy_score(y_true_arr, y_pred_arr)
    prec = precision_score(y_true_arr, y_pred_arr, zero_division=0)
    rec = recall_score(y_true_arr, y_pred_arr, zero_division=0)
    f1 = f1_score(y_true_arr, y_pred_arr, zero_division=0)
    roc_auc = roc_auc_score(y_true_arr, y_prob_arr)
    precision_curve, recall_curve, _ = precision_recall_curve(y_true_arr, y_prob_arr)
    pr_auc = auc(recall_curve, precision_curve)
    eer, eer_thresh = compute_eer(y_true_arr, y_prob_arr)
    brier = brier_score_loss(y_true_arr, y_prob_arr)
    ece = compute_ece(y_true_arr, y_prob_arr)

    cm = confusion_matrix(y_true_arr, y_pred_arr)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    results = {
        "evaluation_timestamp": time.time(),
        "total_samples_evaluated": len(y_true),
        "operating_point_threshold": operating_threshold,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "specificity": round(float(specificity), 4),
            "roc_auc": round(float(roc_auc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "equal_error_rate_eer": round(float(eer), 4),
            "eer_threshold": round(float(eer_thresh), 4),
            "brier_score": round(float(brier), 4),
            "expected_calibration_error_ece": round(float(ece), 4),
            "real_human_false_positive_rate": round(float(fpr * 100.0), 2),
            "spoof_false_negative_rate": round(float(fnr * 100.0), 2),
        },
        "confusion_matrix": {
            "true_negatives_human_as_human": int(tn),
            "false_positives_human_as_spoof": int(fp),
            "false_negatives_spoof_as_human": int(fn),
            "true_positives_spoof_as_spoof": int(tp),
        },
        "3_state_distribution": {
            "human_classified_bonafide": sum(1 for i in range(len(y_true)) if y_true[i] == 0 and classifications[i] == CLASS_BONAFIDE),
            "human_classified_uncertain": sum(1 for i in range(len(y_true)) if y_true[i] == 0 and classifications[i] == CLASS_UNCERTAIN),
            "human_classified_spoof": sum(1 for i in range(len(y_true)) if y_true[i] == 0 and classifications[i] == CLASS_SPOOF),
            "spoof_classified_spoof": sum(1 for i in range(len(y_true)) if y_true[i] == 1 and classifications[i] == CLASS_SPOOF),
            "spoof_classified_uncertain": sum(1 for i in range(len(y_true)) if y_true[i] == 1 and classifications[i] == CLASS_UNCERTAIN),
            "spoof_classified_bonafide": sum(1 for i in range(len(y_true)) if y_true[i] == 1 and classifications[i] == CLASS_BONAFIDE),
        },
    }

    out_dir = ROOT_DIR / "evaluation" / "results"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "evaluation_metrics.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 80)
    print("VOICESHIELD FORMAL STATISTICAL EVALUATION REPORT")
    print("=" * 80)
    print(f"Accuracy        : {results['metrics']['accuracy'] * 100:.2f}%")
    print(f"Precision       : {results['metrics']['precision'] * 100:.2f}%")
    print(f"Recall          : {results['metrics']['recall'] * 100:.2f}%")
    print(f"F1 Score        : {results['metrics']['f1_score']:.4f}")
    print(f"ROC-AUC         : {results['metrics']['roc_auc']:.4f}")
    print(f"PR-AUC          : {results['metrics']['pr_auc']:.4f}")
    print(f"Equal Error Rate: {results['metrics']['equal_error_rate_eer'] * 100:.2f}%")
    print(f"Brier Loss      : {results['metrics']['brier_score']:.4f}")
    print(f"ECE Calibration : {results['metrics']['expected_calibration_error_ece']:.4f}")
    print("-" * 80)
    print(f"Human False Positive Rate (FPR): {results['metrics']['real_human_false_positive_rate']}%")
    print(f"Spoof False Negative Rate (FNR): {results['metrics']['spoof_false_negative_rate']}%")
    print(f"Confusion Matrix: TN={tn} | FP={fp} | FN={fn} | TP={tp}")
    print("=" * 80 + "\n")

    return results


if __name__ == "__main__":
    run_full_evaluation(num_samples=35)
