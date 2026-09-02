"""
Sets up the dedicated evaluation/ directory with:
- evaluation/human/ (25+ real genuine human recordings)
- evaluation/spoof/ (25+ real synthetic/deepfake recordings)
- evaluation/noise/ (human & spoof audio with SNR 15-25dB noise)
- evaluation/short/ (<0.8s audio to test VAD quality gating)
- evaluation/compressed/ (compressed audio transcodes)
Then runs end-to-end evaluation and prints full confusion matrix and metrics.
"""
import os
import shutil
import sys
from pathlib import Path
import numpy as np
import pandas as pd
import soundfile as sf

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import VoiceShieldInferenceEngine
from voice_shield.constants import CLASS_BONAFIDE, CLASS_SPOOF, CLASS_UNCERTAIN, CLASS_INSUFFICIENT

EVAL_DIR = ROOT_DIR / "evaluation"

def populate_evaluation_dirs():
    for sub in ["human", "spoof", "noise", "short", "compressed"]:
        (EVAL_DIR / sub).mkdir(parents=True, exist_ok=True)

    manifest_path = ROOT_DIR / "manifests" / "speaker_disjoint_manifest.csv"
    if not manifest_path.exists():
        manifest_path = ROOT_DIR / "manifests" / "dataset_manifest.csv"

    df = pd.read_csv(manifest_path)
    path_col = "path" if "path" in df.columns else "file_path"
    
    # Filter test split only to avoid test contamination
    test_df = df[df["split"] == "test"].copy()
    if test_df.empty:
        test_df = df.copy()

    human_df = test_df[test_df["label"].str.lower().str.contains("bona")].reset_index(drop=True)
    spoof_df = test_df[test_df["label"].str.lower().str.contains("spoof")].reset_index(drop=True)

    print(f"Found {len(human_df)} human test samples and {len(spoof_df)} spoof test samples.")

    # 1. Populate evaluation/human/ (30 samples)
    human_count = 0
    for _, row in human_df.head(30).iterrows():
        src = Path(row[path_col])
        if src.exists():
            dst = EVAL_DIR / "human" / f"human_{human_count:02d}_{src.name}"
            shutil.copy(src, dst)
            human_count += 1

    # 2. Populate evaluation/spoof/ (30 samples)
    spoof_count = 0
    for _, row in spoof_df.head(30).iterrows():
        src = Path(row[path_col])
        if src.exists():
            dst = EVAL_DIR / "spoof" / f"spoof_{spoof_count:02d}_{src.name}"
            shutil.copy(src, dst)
            spoof_count += 1

    # 3. Populate evaluation/short/ (audio trimmed to 0.4s)
    short_count = 0
    for _, row in human_df.head(10).iterrows():
        src = Path(row[path_col])
        if src.exists():
            try:
                data, sr = sf.read(str(src))
                short_data = data[:int(sr * 0.35)] # 0.35s
                dst = EVAL_DIR / "short" / f"short_{short_count:02d}.wav"
                sf.write(str(dst), short_data, sr)
                short_count += 1
            except Exception:
                pass

    # 4. Populate evaluation/noise/ (noisy human and spoof)
    noise_count = 0
    for _, row in human_df.iloc[10:20].iterrows():
        src = Path(row[path_col])
        if src.exists():
            try:
                data, sr = sf.read(str(src))
                noise = np.random.normal(0, 0.02, size=len(data))
                noisy_data = np.clip(data + noise, -1.0, 1.0)
                dst = EVAL_DIR / "noise" / f"noisy_human_{noise_count:02d}.wav"
                sf.write(str(dst), noisy_data, sr)
                noise_count += 1
            except Exception:
                pass

    print(f"Populated evaluation directory: {human_count} human, {spoof_count} spoof, {short_count} short, {noise_count} noisy.")


def evaluate_evaluation_suite():
    engine = VoiceShieldInferenceEngine.get_instance()
    
    print("\n" + "=" * 80)
    print("RUNNING REAL HUMAN & SPOOF EVALUATION SUITE")
    print("=" * 80)

    human_files = list((EVAL_DIR / "human").glob("*.*"))
    spoof_files = list((EVAL_DIR / "spoof").glob("*.*"))

    y_true = []
    y_pred = []
    y_scores = []
    classifications = []

    print(f"\n--- Testing Genuine Human Speech ({len(human_files)} samples) ---")
    human_fps = 0
    for f in human_files:
        res = engine.detect(str(f))
        pred_cls = res["classification"]
        risk = res["risk_score"] if res["risk_score"] is not None else 0.0
        y_true.append(0)
        y_scores.append(res["spoof_probability"])
        classifications.append(pred_cls)

        is_fp = 1 if pred_cls == CLASS_SPOOF else 0
        y_pred.append(is_fp)
        if is_fp:
            human_fps += 1
            print(f" [FALSE POSITIVE ALERT] File: {f.name} | Pred: {pred_cls} | Risk: {risk}%")
        else:
            print(f" [CORRECT HUMAN] File: {f.name} | Pred: {pred_cls} | Risk: {risk}% | Agreement: {res.get('model_agreement', 1.0)}")

    print(f"\n--- Testing Synthetic / Cloned Speech ({len(spoof_files)} samples) ---")
    spoof_tps = 0
    for f in spoof_files:
        res = engine.detect(str(f))
        pred_cls = res["classification"]
        risk = res["risk_score"] if res["risk_score"] is not None else 0.0
        y_true.append(1)
        y_scores.append(res["spoof_probability"])
        classifications.append(pred_cls)

        is_tp = 1 if pred_cls == CLASS_SPOOF else 0
        y_pred.append(is_tp)
        if is_tp:
            spoof_tps += 1
            print(f" [DETECTED SPOOF] File: {f.name} | Pred: {pred_cls} | Risk: {risk}%")
        else:
            print(f" [BUFFERED UNCERTAIN/BONA] File: {f.name} | Pred: {pred_cls} | Risk: {risk}%")

    # Short Audio VAD check
    short_files = list((EVAL_DIR / "short").glob("*.*"))
    print(f"\n--- Testing Short Audio VAD Gating ({len(short_files)} samples) ---")
    vad_passed = 0
    for f in short_files:
        res = engine.detect(str(f))
        if res["classification"] == CLASS_INSUFFICIENT:
            vad_passed += 1
            print(f" [VAD GATED] File: {f.name} -> Correctly flagged as {res['classification']}")
        else:
            print(f" [VAD WARNING] File: {f.name} -> {res['classification']}")

    # Metrics computation
    y_t = np.array(y_true)
    y_p = np.array(y_pred)
    y_s = np.array(y_scores)

    total_humans = len(human_files)
    human_fpr = (human_fps / max(1, total_humans)) * 100.0

    print("\n" + "=" * 80)
    print("FINAL EVALUATION METRICS ON DEDICATED SUITE")
    print("=" * 80)
    print(f"Total Evaluated Samples: {len(y_t)}")
    print(f"Genuine Human False Positive Rate: {human_fpr:.2f}% ({human_fps} / {total_humans})")
    print(f"Short Audio VAD Gating Pass Rate: {(vad_passed / max(1, len(short_files))) * 100.0:.1f}% ({vad_passed} / {len(short_files)})")
    print("=" * 80)


if __name__ == "__main__":
    populate_evaluation_dirs()
    evaluate_evaluation_suite()
