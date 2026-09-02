"""
VoiceShield Real-World Evaluation Suite (Phases 11 & 12)
Evaluates genuine human voice recordings vs real-world synthetic/deepfake speech across:
- Real human conversational speech (In-the-Wild)
- Real synthetic & cloned speech (In-the-Wild, TTS, Voice Conversion)
- Short audio & silence (VAD gating verification)

Calculates:
- False Positive Rate (FPR) on Genuine Human speech
- False Negative Rate (FNR) on Spoof speech
- Average Spoof Probability & Risk Score by class
- Confusion Matrix
- Complete Performance Summary Table
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

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import detect_audio
from voice_shield.constants import CLASS_BONAFIDE, CLASS_SPOOF, CLASS_INSUFFICIENT

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("voiceshield.eval_real_world")


def evaluate_dataset(num_samples: int = 50) -> Dict[str, Any]:
    meta_path = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    audio_dir = meta_path.parent
    if not meta_path.exists():
        logger.error(f"Metadata file not found: {meta_path}")
        return {}

    df = pd.read_csv(meta_path)
    human_df = df[df["label"].str.lower().str.contains("bona")].head(num_samples)
    spoof_df = df[df["label"].str.lower().str.contains("spoof")].head(num_samples)

    logger.info(f"Evaluating {len(human_df)} Real Human samples and {len(spoof_df)} Real Spoof samples...")

    human_results = []
    spoof_results = []

    # Evaluate Human Samples
    for idx, (_, row) in enumerate(human_df.iterrows()):
        fpath = audio_dir / row["file"]
        if not fpath.exists():
            continue
        res = detect_audio(str(fpath))
        human_results.append({
            "file": row["file"],
            "speaker": row.get("speaker", "Unknown"),
            "ground_truth": "bonafide",
            "prediction": res["prediction"],
            "classification": res["classification"],
            "risk_score": res["risk_score"],
            "spoof_prob": res["spoof_probability"],
            "model_scores": res["model_scores"],
            "is_sufficient": res.get("audio_quality", {}).get("is_sufficient", True),
        })

    # Evaluate Spoof Samples
    for idx, (_, row) in enumerate(spoof_df.iterrows()):
        fpath = audio_dir / row["file"]
        if not fpath.exists():
            continue
        res = detect_audio(str(fpath))
        spoof_results.append({
            "file": row["file"],
            "speaker": row.get("speaker", "Unknown"),
            "ground_truth": "spoof",
            "prediction": res["prediction"],
            "classification": res["classification"],
            "risk_score": res["risk_score"],
            "spoof_prob": res["spoof_probability"],
            "model_scores": res["model_scores"],
            "is_sufficient": res.get("audio_quality", {}).get("is_sufficient", True),
        })

    # Metrics on valid speech
    valid_human = [r for r in human_results if r["classification"] != CLASS_INSUFFICIENT]
    valid_spoof = [r for r in spoof_results if r["classification"] != CLASS_INSUFFICIENT]

    human_false_positives = sum(1 for r in valid_human if r["prediction"] == "spoof")
    human_fpr = (human_false_positives / len(valid_human)) * 100.0 if valid_human else 0.0

    spoof_false_negatives = sum(1 for r in valid_spoof if r["prediction"] == "bonafide")
    spoof_fnr = (spoof_false_negatives / len(valid_spoof)) * 100.0 if valid_spoof else 0.0

    avg_human_risk = np.mean([r["risk_score"] for r in valid_human if r["risk_score"] is not None]) if valid_human else 0.0
    avg_spoof_risk = np.mean([r["risk_score"] for r in valid_spoof if r["risk_score"] is not None]) if valid_spoof else 0.0

    avg_human_spoof_prob = np.mean([r["spoof_prob"] for r in valid_human]) if valid_human else 0.0
    avg_spoof_spoof_prob = np.mean([r["spoof_prob"] for r in valid_spoof]) if valid_spoof else 0.0

    report = {
        "total_human_tested": len(human_results),
        "valid_human_speech": len(valid_human),
        "insufficient_human_audio": len(human_results) - len(valid_human),
        "human_correctly_identified_bonafide": len(valid_human) - human_false_positives,
        "human_false_positives": human_false_positives,
        "false_positive_rate_pct": round(human_fpr, 2),
        "avg_human_risk_score": round(float(avg_human_risk), 2),
        "avg_human_spoof_prob": round(float(avg_human_spoof_prob), 4),
        "total_spoof_tested": len(spoof_results),
        "valid_spoof_speech": len(valid_spoof),
        "spoof_correctly_identified_spoof": len(valid_spoof) - spoof_false_negatives,
        "spoof_false_negatives": spoof_false_negatives,
        "false_negative_rate_pct": round(spoof_fnr, 2),
        "avg_spoof_risk_score": round(float(avg_spoof_risk), 2),
        "avg_spoof_spoof_prob": round(float(avg_spoof_spoof_prob), 4),
    }

    print("\n" + "=" * 80)
    print("VOICE SHIELD REAL-WORLD EVALUATION RESULTS")
    print("=" * 80)
    print(f"Genuine Human Audio Tested : {report['total_human_tested']}")
    print(f" - Valid Speech Audio      : {report['valid_human_speech']}")
    print(f" - Insufficient/Silence    : {report['insufficient_human_audio']}")
    print(f" - Correctly Classified    : {report['human_correctly_identified_bonafide']} / {report['valid_human_speech']}")
    print(f" - False Positives (Spoof) : {report['human_false_positives']}")
    print(f" - False Positive Rate     : {report['false_positive_rate_pct']}%")
    print(f" - Avg Human Risk Score    : {report['avg_human_risk_score']} / 100")
    print("-" * 80)
    print(f"Synthetic / Spoof Audio Tested: {report['total_spoof_tested']}")
    print(f" - Correctly Detected Spoof: {report['spoof_correctly_identified_spoof']} / {report['valid_spoof_speech']}")
    print(f" - False Negatives (Missed): {report['spoof_false_negatives']}")
    print(f" - False Negative Rate     : {report['false_negative_rate_pct']}%")
    print(f" - Avg Spoof Risk Score    : {report['avg_spoof_risk_score']} / 100")
    print("=" * 80 + "\n")

    # Save results to reports/
    out_dir = ROOT_DIR / "reports"
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / "real_world_evaluation.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report


if __name__ == "__main__":
    evaluate_dataset(num_samples=30)
