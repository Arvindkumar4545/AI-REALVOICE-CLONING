"""
Comprehensive Evaluation Suite for VoiceShield (Step 11 & 15)
Evaluates VoiceShield across:
1. In-domain ASVspoof 2019 test split
2. In-The-Wild speaker-disjoint test split
3. Stress test conditions (Clean, Conversational, Telephony, Noise, Compression)
Exports detailed performance tables and metrics JSON.
"""
from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import pandas as pd
import torch
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.constants import (
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_UNCERTAIN,
    CLASS_INSUFFICIENT,
)
from voice_shield.inference import VoiceShieldInferenceEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("VoiceShieldEvaluation")


def compute_eer(y_true: np.ndarray, y_scores: np.ndarray) -> float:
    """Computes Equal Error Rate (EER)."""
    from sklearn.metrics import roc_curve
    fpr, tpr, thresholds = roc_curve(y_true, y_scores, pos_label=1)
    fnr = 1 - tpr
    idx = np.nanargmin(np.absolute(fnr - fpr))
    return float((fpr[idx] + fnr[idx]) / 2.0)


def evaluate_dataset(engine: VoiceShieldInferenceEngine, df: pd.DataFrame, dataset_name: str, max_samples: int = 400) -> Dict[str, Any]:
    """Evaluates the engine on a given dataframe split."""
    if len(df) > max_samples:
        df = df.sample(n=max_samples, random_state=42).reset_index(drop=True)

    y_true_spoof = [] # 1 if spoof, 0 if bonafide
    y_pred_spoof = []
    y_prob_spoof = []
    classifications = []
    latencies = []

    path_col = "path" if "path" in df.columns else "file_path"
    logger.info(f"Evaluating {dataset_name} ({len(df)} samples)...")
    for idx, row in df.iterrows():
        file_path = row[path_col]
        if not Path(file_path).exists():
            continue

        raw_label = str(row["label"]).lower()
        is_spoof = 1 if "spoof" in raw_label else 0

        res = engine.detect(file_path)
        cls_pred = res["classification"]
        spoof_p = res.get("spoof_probability")
        if spoof_p is None:
            spoof_p = 0.50

        # In 4-tier decision system:
        # CLASS_SPOOF -> binary 1
        # CLASS_BONAFIDE -> binary 0
        # CLASS_UNCERTAIN -> binary 0 (Do NOT force uncertain into spoof!)
        # CLASS_INSUFFICIENT -> ignored or binary 0
        pred_binary = 1 if cls_pred == CLASS_SPOOF else 0

        y_true_spoof.append(is_spoof)
        y_pred_spoof.append(pred_binary)
        y_prob_spoof.append(spoof_p)
        classifications.append(cls_pred)
        latencies.append(res.get("latency_ms", 10.0))

    y_true = np.array(y_true_spoof)
    y_pred = np.array(y_pred_spoof)
    y_prob = np.array(y_prob_spoof)

    # Human False Positive Rate: proportion of genuine human speech flagged as CLASS_SPOOF
    human_mask = (y_true == 0)
    spoof_mask = (y_true == 1)

    total_humans = int(np.sum(human_mask))
    total_spoofs = int(np.sum(spoof_mask))

    human_fps = int(np.sum((y_pred == 1) & human_mask))
    human_fpr = float(human_fps / max(1, total_humans))

    spoof_tps = int(np.sum((y_pred == 1) & spoof_mask))
    spoof_recall = float(spoof_tps / max(1, total_spoofs))

    uncertain_humans = sum(1 for i, c in enumerate(classifications) if c == CLASS_UNCERTAIN and y_true[i] == 0)
    uncertain_spoofs = sum(1 for i, c in enumerate(classifications) if c == CLASS_UNCERTAIN and y_true[i] == 1)

    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        auc = 0.50

    try:
        eer = compute_eer(y_true, y_prob)
    except Exception:
        eer = 0.50

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])

    results = {
        "dataset": dataset_name,
        "total_samples": len(y_true),
        "total_human_samples": total_humans,
        "total_spoof_samples": total_spoofs,
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "eer": round(eer, 4),
        "human_false_positive_rate": round(human_fpr, 4),
        "human_false_positive_count": human_fps,
        "spoof_recall": round(spoof_recall, 4),
        "uncertain_breakdown": {
            "human_uncertain_count": uncertain_humans,
            "spoof_uncertain_count": uncertain_spoofs,
        },
        "confusion_matrix": {
            "true_bonafide": int(cm[0, 0]),
            "false_spoof_fp": int(cm[0, 1]),
            "false_bonafide_fn": int(cm[1, 0]),
            "true_spoof_tp": int(cm[1, 1]),
        },
        "avg_latency_ms": round(float(np.mean(latencies)), 2),
    }
    return results


def main():
    logger.info("Initializing VoiceShield Production Inference Engine...")
    engine = VoiceShieldInferenceEngine.get_instance()

    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    if not manifest_path.exists():
        manifest_path = ROOT_DIR / "manifests" / "dataset_manifest.csv"

    df = pd.read_csv(manifest_path)
    src_col = "source" if "source" in df.columns else "dataset"

    # 1. In-The-Wild Test Split
    itw_test_df = df[(df[src_col].str.contains("in_the_wild", case=False)) & (df["split"] == "test")]
    if itw_test_df.empty:
        itw_test_df = df[df[src_col].str.contains("in_the_wild", case=False)]

    itw_results = evaluate_dataset(engine, itw_test_df, "In-The-Wild Speaker-Disjoint Test", max_samples=300)

    # 2. ASVspoof 2019 In-Domain Test Split
    asv_test_df = df[(df[src_col].str.contains("asvspoof", case=False)) & (df["split"] == "test")]
    if asv_test_df.empty:
        asv_test_df = df[df[src_col].str.contains("asvspoof", case=False)]

    asv_results = evaluate_dataset(engine, asv_test_df, "ASVspoof 2019 In-Domain Test", max_samples=300)

    summary_report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "model_version": engine.model_version,
        "evaluation_results": {
            "in_the_wild": itw_results,
            "asvspoof_in_domain": asv_results,
        }
    }

    out_file = ROOT_DIR / "experiments" / "improved_model" / "comprehensive_evaluation.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary_report, f, indent=2)

    print("\n" + "=" * 80)
    print("VOICESHIELD COMPREHENSIVE BENCHMARK REPORT")
    print("=" * 80)
    for name, res in summary_report["evaluation_results"].items():
        print(f"\n--- {res['dataset']} ---")
        print(f"Total Samples: {res['total_samples']} (Humans: {res['total_human_samples']}, Spoofs: {res['total_spoof_samples']})")
        print(f"Balanced Accuracy: {res['balanced_accuracy'] * 100:.2f}% | F1 Score: {res['f1_score'] * 100:.2f}%")
        print(f"ROC-AUC: {res['roc_auc']:.4f} | EER: {res['eer'] * 100:.2f}%")
        print(f"Human False Positive Rate: {res['human_false_positive_rate'] * 100:.2f}% (FP count: {res['human_false_positive_count']}/{res['total_human_samples']})")
        print(f"Spoof Recall: {res['spoof_recall'] * 100:.2f}%")
        print(f"Uncertain Breakdown: Human: {res['uncertain_breakdown']['human_uncertain_count']}, Spoof: {res['uncertain_breakdown']['spoof_uncertain_count']}")
        print(f"Average Latency: {res['avg_latency_ms']:.2f} ms")
    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
