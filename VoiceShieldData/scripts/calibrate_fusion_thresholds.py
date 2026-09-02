"""
Optimal Threshold Calibration for VoiceShield Fusion Engine
Finds the optimal (T_lower, T_upper) thresholds on the validation set to guarantee:
- Human FPR <= 3.0%
- Maximized Spoof Recall
- Proper UNCERTAIN routing for borderline samples
"""
import sys
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import VoiceShieldInferenceEngine

def main():
    engine = VoiceShieldInferenceEngine.get_instance()
    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    df = pd.read_csv(manifest_path)
    src_col = "source" if "source" in df.columns else "dataset"
    path_col = "path" if "path" in df.columns else "file_path"

    dev_df = df[df["split"] == "dev"].sample(n=400, random_state=42).reset_index(drop=True)

    y_true = []
    lcnn_scores = []
    wavlm_scores = []
    bilstm_scores = []
    fusion_scores = []

    print(f"Collecting predictions on {len(dev_df)} dev samples...")
    for _, row in dev_df.iterrows():
        p = row[path_col]
        if not Path(p).exists():
            continue
        is_spoof = 1 if "spoof" in str(row["label"]).lower() else 0
        res = engine.detect(p)
        y_true.append(is_spoof)
        lcnn_scores.append(res["model_scores"]["lcnn"])
        wavlm_scores.append(res["model_scores"]["wavlm"])
        bilstm_scores.append(res["model_scores"]["bilstm"])
        fusion_scores.append(res["spoof_probability"])

    y_true = np.array(y_true)
    fusion_scores = np.array(fusion_scores)
    human_mask = (y_true == 0)
    spoof_mask = (y_true == 1)

    print(f"Dev split: {np.sum(human_mask)} Humans, {np.sum(spoof_mask)} Spoofs")
    print(f"Human score 95th percentile: {np.percentile(fusion_scores[human_mask], 95):.4f}")
    print(f"Human score 98th percentile: {np.percentile(fusion_scores[human_mask], 98):.4f}")
    print(f"Spoof score 50th percentile: {np.percentile(fusion_scores[spoof_mask], 50):.4f}")
    print(f"Spoof score 75th percentile: {np.percentile(fusion_scores[spoof_mask], 75):.4f}")

    # Grid search for optimal (T_lower, T_upper)
    best_config = None
    best_score = -1

    for t_lower in np.linspace(0.15, 0.35, 21):
        for t_upper in np.linspace(0.36, 0.55, 20):
            # Decisions:
            # score < t_lower -> BONAFIDE (0)
            # score > t_upper -> SPOOF (1)
            # t_lower <= score <= t_upper -> UNCERTAIN (0 for spoof false alarms)
            pred_spoof = (fusion_scores > t_upper).astype(int)
            human_fpr = np.sum(pred_spoof[human_mask]) / max(1, np.sum(human_mask))
            spoof_rec = np.sum(pred_spoof[spoof_mask]) / max(1, np.sum(spoof_mask))

            if human_fpr <= 0.03:  # FPR <= 3%
                if spoof_rec > best_score:
                    best_score = spoof_rec
                    best_config = (t_lower, t_upper, human_fpr, spoof_rec)

    if best_config:
        t_low, t_high, fpr, rec = best_config
        print(f"\nOptimal Calibrated Thresholds: Lower={t_low:.3f}, Upper={t_high:.3f}")
        print(f"Achieved Human FPR: {fpr * 100:.2f}%, Spoof Recall: {rec * 100:.2f}%")
        
        # Save to model_artifacts/calibration.json
        cal_path = ROOT_DIR / "model_artifacts" / "calibration.json"
        cal_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cal_path, "w", encoding="utf-8") as f:
            json.dump({
                "threshold_lower": round(float(t_low), 3),
                "threshold_upper": round(float(t_high), 3),
                "human_fpr_dev": round(float(fpr), 4),
                "spoof_recall_dev": round(float(rec), 4),
                "method": "Speaker-disjoint dev calibration",
            }, f, indent=2)
        print(f"Saved calibration config to {cal_path}")

if __name__ == "__main__":
    main()
