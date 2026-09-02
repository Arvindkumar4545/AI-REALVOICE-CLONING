"""
VoiceShield Production Real Audio Test
Evaluates 5 bona-fide and 5 spoof audio samples from the ASVspoof evaluation split.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from voice_shield.inference import VoiceShieldInferenceEngine

BASE_DIR = Path(r"F:\VoiceShieldData")
MANIFEST_PATH = BASE_DIR / "manifests" / "dataset_manifest.csv"

def run_real_audio_test():
    print("=" * 85)
    print("        VOICE SHIELD — REAL AUDIO INFERENCE EVALUATION (5 BONA-FIDE / 5 SPOOF)")
    print("=" * 85)

    engine = VoiceShieldInferenceEngine()
    print(f"Loaded Model Version: {engine.model_version}")
    print(f"Active Operating Threshold: {engine.threshold:.4f}\n")

    manifest = pd.read_csv(MANIFEST_PATH)
    eval_df = manifest[manifest["split"] == "eval"]

    bonafide_samples = eval_df[eval_df["label"] == "bonafide"].head(5)
    spoof_samples = eval_df[eval_df["label"] == "spoof"].head(5)

    test_df = pd.concat([bonafide_samples, spoof_samples]).reset_index(drop=True)

    y_true_str = []
    y_pred_str = []
    y_true_bin = []
    y_pred_bin = []

    rows = []
    for idx, row in test_df.iterrows():
        fpath = Path(row["path"])
        true_label = row["label"]
        
        result = engine.predict(fpath)
        pred_label = result["prediction"]
        spoof_prob = result["spoof_probability"]
        thresh = result["threshold"]
        
        is_correct = (pred_label == true_label)
        
        y_true_str.append(true_label)
        y_pred_str.append(pred_label)
        y_true_bin.append(1 if true_label == "bonafide" else 0)
        y_pred_bin.append(1 if pred_label == "bonafide" else 0)
        
        rows.append({
            "File": fpath.name,
            "True Label": true_label,
            "Predicted Label": pred_label,
            "Spoof Prob (%)": f"{spoof_prob:.2f}%",
            "Threshold": f"{thresh:.4f}",
            "Latency": f"{result['latency_ms']:.1f}ms",
            "Status": "CORRECT [PASS]" if is_correct else "INCORRECT [FAIL]"
        })

    # Display Table
    print(f"{'#':<3} | {'Audio File':<24} | {'True Label':<10} | {'Predicted':<10} | {'Spoof Prob':<11} | {'Threshold':<10} | {'Latency':<8} | {'Result':<16}")
    print("-" * 110)
    for i, r in enumerate(rows, 1):
        print(f"{i:<3} | {r['File']:<24} | {r['True Label']:<10} | {r['Predicted Label']:<10} | {r['Spoof Prob (%)']:<11} | {r['Threshold']:<10} | {r['Latency']:<8} | {r['Status']:<16}")
    print("-" * 110)

    # Compute classification metrics
    acc = accuracy_score(y_true_bin, y_pred_bin)
    prec = precision_score(y_true_bin, y_pred_bin, zero_division=0)
    rec = recall_score(y_true_bin, y_pred_bin, zero_division=0)
    f1 = f1_score(y_true_bin, y_pred_bin, zero_division=0)

    print("\nSAMPLE BATCH METRICS SUMMARY:")
    print(f"  • Total Tested Samples: {len(test_df)} (5 Genuine Bona-Fide, 5 Deepfake/Spoof)")
    print(f"  • Accuracy:             {acc * 100:.1f}%")
    print(f"  • Bona-fide Precision:  {prec * 100:.1f}%")
    print(f"  • Bona-fide Recall:     {rec * 100:.1f}%")
    print(f"  • F1 Score:             {f1:.4f}")
    print("=" * 85)

if __name__ == "__main__":
    run_real_audio_test()
