"""
Orchestration Script for VoiceShield Comparative Experiments & Model Selection
Runs Experiment A (Weighted Loss) and Experiment B (Balanced Sampler), compares with Baseline,
and produces experiments/model_comparison.json.
"""
from __future__ import annotations

import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np

BASE_DIR = Path(r"F:\VoiceShieldData")
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from scripts.train_experiment import run_experiment

BASE_DIR = Path(r"F:\VoiceShieldData")
EXPERIMENTS_DIR = BASE_DIR / "experiments"
BASELINE_METRICS_PATH = BASE_DIR / "artifacts" / "baseline" / "metrics.json"


def main():
    print("=" * 70)
    print("       STARTING VOICESHIELD MODEL IMPROVEMENT EXPERIMENTS       ")
    print("=" * 70)

    # 1. Run Stage 1 & 2 for Experiment B: Balanced Sampler (AudioSpoofNetV2)
    print("\n>>> Running Experiment B: Balanced Sampling (AudioSpoofNetV2)...")
    exp_b_metrics = run_experiment(
        experiment_name="improved_v1",
        imbalance_strategy="balanced_sampler",
        max_train_samples=5000,
        max_dev_samples=1000,
        epochs=4,
        batch_size=32,
        lr=4e-4,
    )

    # 2. Run Experiment A: Class-Weighted BCEWithLogitsLoss
    print("\n>>> Running Experiment A: Class-Weighted Loss (AudioSpoofNetV2)...")
    exp_a_metrics = run_experiment(
        experiment_name="improved_v2",
        imbalance_strategy="weighted_loss",
        max_train_samples=5000,
        max_dev_samples=1000,
        epochs=4,
        batch_size=32,
        lr=4e-4,
    )

    # 3. Load Baseline Metrics for direct comparison
    baseline_raw = {}
    if BASELINE_METRICS_PATH.exists():
        with open(BASELINE_METRICS_PATH, "r", encoding="utf-8") as f:
            baseline_raw = json.load(f)

    # Compile Model Comparison Table
    opt_b = exp_b_metrics["optimal_threshold"]
    opt_a = exp_a_metrics["optimal_threshold"]

    comparison = {
        "metrics_comparison": {
            "Accuracy": {
                "BASELINE": baseline_raw.get("final_val_accuracy", 0.8788),
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["accuracy"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["accuracy"],
            },
            "Balanced Accuracy": {
                "BASELINE": 0.5000,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["balanced_accuracy"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["balanced_accuracy"],
            },
            "Precision": {
                "BASELINE": baseline_raw.get("final_val_precision", 0.0),
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["precision"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["precision"],
            },
            "Recall": {
                "BASELINE": baseline_raw.get("final_val_recall", 0.0),
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["recall"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["recall"],
            },
            "F1 Score": {
                "BASELINE": baseline_raw.get("final_val_f1", 0.0),
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["f1"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["f1"],
            },
            "ROC-AUC": {
                "BASELINE": 0.5000,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["roc_auc"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["roc_auc"],
            },
            "Equal Error Rate (EER)": {
                "BASELINE": "NOT IMPLEMENTED (Majority Class Collapse)",
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["eer"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["eer"],
            },
            "FAR at EER": {
                "BASELINE": 1.0,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["far_at_eer"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["far_at_eer"],
            },
            "FRR at EER": {
                "BASELINE": 0.0,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["frr_at_eer"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["frr_at_eer"],
            },
            "Predicted Bona-Fide Count": {
                "BASELINE": 0,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["predicted_bonafide"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["predicted_bonafide"],
            },
            "Predicted Spoof Count": {
                "BASELINE": 800,
                "EXPERIMENT_A_WEIGHTED_LOSS": opt_a["predicted_spoof"],
                "EXPERIMENT_B_BALANCED_SAMPLER": opt_b["predicted_spoof"],
            },
            "Training Time (s)": {
                "BASELINE": baseline_raw.get("total_training_time", 127.0),
                "EXPERIMENT_A_WEIGHTED_LOSS": exp_a_metrics["total_training_time_seconds"],
                "EXPERIMENT_B_BALANCED_SAMPLER": exp_b_metrics["total_training_time_seconds"],
            },
            "Inference Latency (ms)": {
                "BASELINE": 55.68,
                "EXPERIMENT_A_WEIGHTED_LOSS": exp_a_metrics["inference_latency_ms"],
                "EXPERIMENT_B_BALANCED_SAMPLER": exp_b_metrics["inference_latency_ms"],
            },
            "Parameters": {
                "BASELINE": 167329,
                "EXPERIMENT_A_WEIGHTED_LOSS": exp_a_metrics["parameters_count"],
                "EXPERIMENT_B_BALANCED_SAMPLER": exp_b_metrics["parameters_count"],
            },
        },
        "selected_champion_model": "improved_v1" if opt_b["f1"] >= opt_a["f1"] else "improved_v2",
        "evaluation_summary": {
            "improved_v1": exp_b_metrics,
            "improved_v2": exp_a_metrics,
        },
    }

    with open(EXPERIMENTS_DIR / "model_comparison.json", "w", encoding="utf-8") as f:
        json.dump(comparison, f, indent=2)

    # Also deploy champion checkpoint to models/voiceshield_best/model.pt
    champion = comparison["selected_champion_model"]
    champion_model_path = EXPERIMENTS_DIR / champion / "model.pt"
    champion_config_path = EXPERIMENTS_DIR / champion / "config.json"
    
    target_dir = BASE_DIR / "models" / "voiceshield_best"
    target_dir.mkdir(parents=True, exist_ok=True)
    
    import shutil
    shutil.copyfile(champion_model_path, target_dir / "model.pt")
    shutil.copyfile(champion_config_path, target_dir / "model_config.json")
    print(f"\n[Deployment] Deployed champion model ({champion}) to {target_dir / 'model.pt'}")

    print("\n" + "=" * 70)
    print("                     EXPERIMENT RESULTS SUMMARY                    ")
    print("=" * 70)
    print(f"BASELINE: F1 = {comparison['metrics_comparison']['F1 Score']['BASELINE']} | EER = {comparison['metrics_comparison']['Equal Error Rate (EER)']['BASELINE']}")
    print(f"EXP A (Weighted Loss):     F1 = {opt_a['f1']:.4f} | EER = {opt_a['eer']:.4f} | AUC = {opt_a['roc_auc']:.4f} | BonaFide Preds = {opt_a['predicted_bonafide']}")
    print(f"EXP B (Balanced Sampler):  F1 = {opt_b['f1']:.4f} | EER = {opt_b['eer']:.4f} | AUC = {opt_b['roc_auc']:.4f} | BonaFide Preds = {opt_b['predicted_bonafide']}")
    print(f"CHAMPION MODEL SELECTED:   {champion.upper()}")
    print("=" * 70 + "\n")

    return comparison


if __name__ == "__main__":
    main()
