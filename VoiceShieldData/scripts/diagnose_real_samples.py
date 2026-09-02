import sys
from pathlib import Path
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from voice_shield.inference import detect_audio

def main():
    meta_path = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    audio_dir = meta_path.parent
    df = pd.read_csv(meta_path)

    human_df = df[df["label"].str.lower().str.contains("bona")].head(8)
    spoof_df = df[df["label"].str.lower().str.contains("spoof")].head(8)

    print("=" * 80)
    print("TESTING REAL HUMAN IN-THE-WILD SAMPLES")
    print("=" * 80)
    for _, row in human_df.iterrows():
        p = audio_dir / row["file"]
        res = detect_audio(str(p))
        scores = res["model_scores"]
        risk_str = f"{res['risk_score']:.1f}" if res.get("risk_score") is not None else "N/A"
        print(f"File: {row['file']:<10} | Speaker: {row['speaker']:<20} | Pred: {res['prediction']:<8} | Risk: {risk_str:<5} | LCNN: {scores['lcnn']:.3f} | RawNet: {scores['rawnet2']:.3f} | AASIST: {scores['aasist']:.3f} | WavLM: {scores['wavlm']:.3f} | BiLSTM: {scores['bilstm']:.3f}")

    print("\n" + "=" * 80)
    print("TESTING REAL SPOOF IN-THE-WILD SAMPLES")
    print("=" * 80)
    for _, row in spoof_df.iterrows():
        p = audio_dir / row["file"]
        res = detect_audio(str(p))
        scores = res["model_scores"]
        risk_str = f"{res['risk_score']:.1f}" if res.get("risk_score") is not None else "N/A"
        print(f"File: {row['file']:<10} | Speaker: {row['speaker']:<20} | Pred: {res['prediction']:<8} | Risk: {risk_str:<5} | LCNN: {scores['lcnn']:.3f} | RawNet: {scores['rawnet2']:.3f} | AASIST: {scores['aasist']:.3f} | WavLM: {scores['wavlm']:.3f} | BiLSTM: {scores['bilstm']:.3f}")

if __name__ == "__main__":
    main()
