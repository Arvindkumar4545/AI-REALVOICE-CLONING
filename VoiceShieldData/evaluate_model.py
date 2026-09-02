"""
VoiceShield Comprehensive Model Benchmark & Evaluation Suite (Phases 4, 16, 17)
Evaluates the VoiceShield Calibrated Multi-Model Ensemble across:
- ASVspoof 2019 Evaluation Split (In-Domain)
- In-The-Wild Real-World Speech (Out-of-Domain)

Generates complete metrics:
- ROC-AUC, PR-AUC, EER
- Precision, Recall, F1-Score, Balanced Accuracy
- False Positive Rate (FPR), False Negative Rate (FNR)
- Confusion Matrix
- Exports results to reports/model_evaluation.json
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
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    roc_curve,
)

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import detect_audio
from voice_shield.constants import CLASS_BONAFIDE, CLASS_SPOOF, CLASS_INSUFFICIENT

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voiceshield.eval_model")


def run_model_evaluation(num_samples: int = 40) -> Dict[str, Any]:
    logger.info("=" * 80)
    logger.info("VOICE SHIELD COMPREHENSIVE MULTI-DATASET MODEL BENCHMARK")
    logger.info("=" * 80)

    # 1. In-The-Wild Dataset
    itw_meta = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    eval_records = []

    if itw_meta.exists():
        df = pd.read_csv(itw_meta)
        human_sample = df[df["label"].str.lower().str.contains("bona")].head(num_samples // 2)
        spoof_sample = df[df["label"].str.lower().str.contains("spoof")].head(num_samples // 2)
        combined = pd.concat([human_sample, spoof_sample])

        for _, row in combined.iterrows():
            fpath = itw_meta.parent / row["file"]
            if fpath.exists():
                eval_records.append({
                    "path": str(fpath),
                    "label": "bonafide" if "bona" in str(row["label"]).lower() else "spoof",
                    "target": 1 if "bona" in str(row["label"]).lower() else 0,
                    "dataset": "In-The-Wild",
                })

    # 2. ASVspoof Dataset
    manifest_path = ROOT_DIR / "manifests" / "dataset_manifest.csv"
    if manifest_path.exists():
        asv_df = pd.read_csv(manifest_path)
        asv_bonafide = asv_df[asv_df["label"].str.lower().str.contains("bona")].head(num_samples // 2)
        asv_spoof = asv_df[asv_df["label"].str.lower().str.contains("spoof")].head(num_samples // 2)
        asv_combined = pd.concat([asv_bonafide, asv_spoof])

        for _, row in asv_combined.iterrows():
            fpath = Path(row["path"])
            if fpath.exists():
                eval_records.append({
                    "path": str(fpath),
                    "label": "bonafide" if "bona" in str(row["label"]).lower() else "spoof",
                    "target": 1 if "bona" in str(row["label"]).lower() else 0,
                    "dataset": "ASVspoof 2019",
                })

    logger.info(f"Total benchmark audio files to evaluate: {len(eval_records)}")

    y_true = []
    y_scores = []
    latencies = []
    results = []

    t0 = time.time()
    for item in eval_records:
        t_start = time.perf_counter()
        res = detect_audio(item["path"])
        lat_ms = (time.perf_counter() - t_start) * 1000.0
        latencies.append(lat_ms)

        if res["classification"] == CLASS_INSUFFICIENT:
            continue

        # Score is bonafide probability (1.0 = genuine, 0.0 = spoof)
        bonafide_p = res.get("bonafide_probability", 1.0 - (res.get("spoof_probability") or 0.0))
        y_true.append(item["target"])
        y_scores.append(bonafide_p)
        results.append({
            "path": item["path"],
            "dataset": item["dataset"],
            "target": item["target"],
            "prediction": res["prediction"],
            "risk_score": res["risk_score"],
            "bonafide_prob": bonafide_p,
            "latency_ms": round(lat_ms, 2),
        })

    y_true = np.array(y_true)
    y_scores = np.array(y_scores)
    y_pred = (y_scores >= 0.50).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))

    try:
        auc = float(roc_auc_score(y_true, y_scores))
        pr_auc = float(average_precision_score(y_true, y_scores))
    except Exception:
        auc = 0.5
        pr_auc = 0.5

    try:
        fpr, tpr, thresholds = roc_curve(y_true, y_scores, pos_label=1)
        fnr = 1.0 - tpr
        eer_idx = np.nanargmin(np.abs(fpr - fnr))
        eer = float(fpr[eer_idx])
        opt_thresh = float(thresholds[eer_idx])
    except Exception:
        eer = 0.5
        opt_thresh = 0.5

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    fpr_rate = float(fp / max(1, fp + tn))
    fnr_rate = float(fn / max(1, fn + tp))

    benchmark_report = {
        "model_version": "VoiceShield-v2.0.0-Ensemble",
        "total_samples_evaluated": len(y_true),
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "roc_auc": round(auc, 4),
        "pr_auc": round(pr_auc, 4),
        "eer": round(eer, 4),
        "calibrated_threshold": round(opt_thresh, 4),
        "false_positive_rate": round(fpr_rate, 4),
        "false_negative_rate": round(fnr_rate, 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "avg_latency_ms": round(float(np.mean(latencies)), 2),
        "p95_latency_ms": round(float(np.percentile(latencies, 95)), 2),
    }

    print("\n" + "=" * 80)
    print("VOICE SHIELD MULTI-MODEL BENCHMARK RESULTS")
    print("=" * 80)
    print(f"Model Champion         : {benchmark_report['model_version']}")
    print(f"Total Audio Evaluated  : {benchmark_report['total_samples_evaluated']}")
    print(f"Balanced Accuracy      : {benchmark_report['balanced_accuracy'] * 100:.2f}%")
    print(f"ROC-AUC                : {benchmark_report['roc_auc']:.4f}")
    print(f"Equal Error Rate (EER) : {benchmark_report['eer'] * 100:.2f}%")
    print(f"F1-Score               : {benchmark_report['f1_score']:.4f}")
    print(f"False Positive Rate    : {benchmark_report['false_positive_rate'] * 100:.2f}%")
    print(f"False Negative Rate    : {benchmark_report['false_negative_rate'] * 100:.2f}%")
    print(f"Confusion Matrix       : TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print(f"Average Latency        : {benchmark_report['avg_latency_ms']} ms")
    print("=" * 80 + "\n")

    # Save to reports/
    out_dir = ROOT_DIR / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "model_evaluation.json", "w", encoding="utf-8") as f:
        json.dump(benchmark_report, f, indent=2)

    return benchmark_report


if __name__ == "__main__":
    run_model_evaluation(num_samples=40)
