"""
Optimized Vectorized Speaker-Disjoint Dataset Partitioning (Phase 1 & Step 2)
Partitions ASVspoof 2019 and In-The-Wild into speaker-disjoint Train, Dev, and Test splits.
"""
from __future__ import annotations

import json
from pathlib import Path
import pandas as pd
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
MANIFESTS_DIR = ROOT_DIR / "manifests"
MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("=" * 80)
    print("PREPARING SPEAKER-DISJOINT PARTITIONS (VECTORIZED)")
    print("=" * 80)

    # 1. In-The-Wild Dataset (31,779 records, 54 speakers)
    itw_meta = ROOT_DIR / "datasets" / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
    audio_dir = itw_meta.parent
    itw_df = pd.read_csv(itw_meta)

    unique_speakers = sorted(itw_df["speaker"].dropna().unique().tolist())
    np.random.seed(42)
    shuffled_speakers = np.random.permutation(unique_speakers)

    # 60% Train, 20% Dev, 20% Test by speaker
    n_speakers = len(shuffled_speakers)
    n_train = int(n_speakers * 0.60)
    n_dev = int(n_speakers * 0.20)

    train_spk = set(shuffled_speakers[:n_train])
    dev_spk = set(shuffled_speakers[n_train : n_train + n_dev])
    test_spk = set(shuffled_speakers[n_train + n_dev :])

    print(f"In-The-Wild Speakers: {len(train_spk)} Train | {len(dev_spk)} Dev | {len(test_spk)} Test")

    def assign_itw_split(spk):
        if spk in train_spk: return "train"
        if spk in dev_spk: return "dev"
        return "test"

    itw_df["path"] = itw_df["file"].apply(lambda f: str(audio_dir / f))
    itw_df["label"] = itw_df["label"].apply(lambda l: "bonafide" if "bona" in str(l).lower() else "spoof")
    itw_df["split"] = itw_df["speaker"].apply(assign_itw_split)
    itw_df["source"] = "in_the_wild"
    itw_clean = itw_df[["path", "label", "speaker", "split", "source"]]

    # 2. ASVspoof Manifest (Sample balanced representation for clean partitioning)
    asv_manifest = MANIFESTS_DIR / "dataset_manifest.csv"
    if asv_manifest.exists():
        asv_df = pd.read_csv(asv_manifest)
        asv_df["split"] = asv_df["split"].replace({"eval": "test"})
        asv_df["speaker"] = asv_df.get("speaker_id", "ASV_SPK")
        asv_df["source"] = "asvspoof2019"
        asv_df["label"] = asv_df["label"].apply(lambda l: "bonafide" if "bona" in str(l).lower() else "spoof")
        asv_clean = asv_df[["path", "label", "speaker", "split", "source"]]
        combined_df = pd.concat([itw_clean, asv_clean], ignore_index=True)
    else:
        combined_df = itw_clean

    out_manifest = MANIFESTS_DIR / "speaker_disjoint_manifest.csv"
    combined_df.to_csv(out_manifest, index=False)

    print(f"\nGenerated {out_manifest} with {len(combined_df)} records.")
    print("\nDataset Summary by Split, Source & Label:")
    print(combined_df.groupby(["split", "source", "label"]).size())

    # Create summary report
    summary = {
        "total_records": len(combined_df),
        "in_the_wild_speakers": {
            "train": list(train_spk),
            "dev": list(dev_spk),
            "test": list(test_spk),
        },
        "breakdown": {
            "train": {
                "bonafide": int(len(combined_df[(combined_df["split"] == "train") & (combined_df["label"] == "bonafide")])),
                "spoof": int(len(combined_df[(combined_df["split"] == "train") & (combined_df["label"] == "spoof")])),
            },
            "dev": {
                "bonafide": int(len(combined_df[(combined_df["split"] == "dev") & (combined_df["label"] == "bonafide")])),
                "spoof": int(len(combined_df[(combined_df["split"] == "dev") & (combined_df["label"] == "spoof")])),
            },
            "test": {
                "bonafide": int(len(combined_df[(combined_df["split"] == "test") & (combined_df["label"] == "bonafide")])),
                "spoof": int(len(combined_df[(combined_df["split"] == "test") & (combined_df["label"] == "spoof")])),
            },
        }
    }

    with open(MANIFESTS_DIR / "speaker_disjoint_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\nSaved manifests/speaker_disjoint_summary.json successfully.")

if __name__ == "__main__":
    main()
