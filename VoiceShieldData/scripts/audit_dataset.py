"""
VoiceShield Dataset Audit & Hygiene Analysis Script
Audits dataset splits, label distribution, speaker-disjointness, and integrity.
"""
from __future__ import annotations

import json
from pathlib import Path
import pandas as pd
import numpy as np

BASE_DIR = Path(r"F:\VoiceShieldData")
MANIFEST_PATH = BASE_DIR / "manifests" / "dataset_manifest.csv"
EXPERIMENTS_DIR = BASE_DIR / "experiments"


def run_dataset_audit():
    print("[Audit] Starting dataset audit...")
    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Manifest not found at {MANIFEST_PATH}")

    df = pd.read_csv(MANIFEST_PATH)
    print(f"[Audit] Total manifest rows: {len(df)}")

    # 1. Split Distribution
    split_counts = df["split"].value_counts().to_dict()
    print(f"[Audit] Split distribution: {split_counts}")

    # 2. Label distribution per split & source
    distribution_by_split = {}
    for split_name in df["split"].unique():
        split_df = df[df["split"] == split_name]
        label_counts = split_df["label"].value_counts().to_dict()
        total = len(split_df)
        bonafide = label_counts.get("bonafide", 0)
        spoof = label_counts.get("spoof", 0)
        distribution_by_split[split_name] = {
            "total": total,
            "bonafide": bonafide,
            "spoof": spoof,
            "bonafide_percentage": round((bonafide / total) * 100, 2) if total > 0 else 0,
            "spoof_percentage": round((spoof / total) * 100, 2) if total > 0 else 0,
        }

    # 3. Distribution by dataset source
    source_counts = df["dataset"].value_counts().to_dict() if "dataset" in df.columns else df["source"].value_counts().to_dict()

    # 4. Speaker Distribution & Disjointness Check
    train_speakers = set(df[df["split"] == "train"]["speaker"].dropna().unique())
    dev_speakers = set(df[df["split"] == "dev"]["speaker"].dropna().unique())
    eval_speakers = set(df[df["split"] == "eval"]["speaker"].dropna().unique())

    train_dev_overlap = list(train_speakers.intersection(dev_speakers))
    train_eval_overlap = list(train_speakers.intersection(eval_speakers))
    dev_eval_overlap = list(dev_speakers.intersection(eval_speakers))

    is_speaker_disjoint = (
        len(train_dev_overlap) == 0 and len(train_eval_overlap) == 0 and len(dev_eval_overlap) == 0
    )

    # 5. Check for duplicate audio file paths
    duplicate_paths = int(df["path"].duplicated().sum())

    # 6. Sample existence check (lazy check on 1000 random paths to verify disk presence)
    sample_check = df.sample(n=min(1000, len(df)), random_state=42)
    missing_in_sample = sum(not Path(p).exists() for p in sample_check["path"])

    audit_results = {
        "total_records": len(df),
        "split_counts": split_counts,
        "distribution_by_split": distribution_by_split,
        "source_counts": source_counts,
        "speaker_stats": {
            "train_unique_speakers": len(train_speakers),
            "dev_unique_speakers": len(dev_speakers),
            "eval_unique_speakers": len(eval_speakers),
            "is_speaker_disjoint": is_speaker_disjoint,
            "train_dev_overlap_count": len(train_dev_overlap),
            "train_eval_overlap_count": len(train_eval_overlap),
            "dev_eval_overlap_count": len(dev_eval_overlap),
        },
        "duplicate_file_paths": duplicate_paths,
        "path_sample_check": {
            "tested_sample_size": len(sample_check),
            "missing_files_in_sample": missing_in_sample,
            "sample_path_validity_percent": round((1.0 - (missing_in_sample / len(sample_check))) * 100, 2),
        },
    }

    # Save to experiments/dataset_stats.json and reports
    EXPERIMENTS_DIR.mkdir(parents=True, exist_ok=True)
    (EXPERIMENTS_DIR / "baseline").mkdir(parents=True, exist_ok=True)
    (EXPERIMENTS_DIR / "improved_v1").mkdir(parents=True, exist_ok=True)
    (EXPERIMENTS_DIR / "improved_v2").mkdir(parents=True, exist_ok=True)

    with open(EXPERIMENTS_DIR / "dataset_stats.json", "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    with open(EXPERIMENTS_DIR / "improved_v1" / "dataset_stats.json", "w", encoding="utf-8") as f:
        json.dump(audit_results, f, indent=2)

    print("\n" + "=" * 60)
    print("                VOICE SHIELD DATASET AUDIT                 ")
    print("=" * 60)
    print(f"Total Audio Files in Manifest: {audit_results['total_records']}")
    print(f"Train Split: {distribution_by_split.get('train')}")
    print(f"Dev Split:   {distribution_by_split.get('dev')}")
    print(f"Eval Split:  {distribution_by_split.get('eval')}")
    print(f"Speaker-Disjointness: {'PASSED (Zero Leakage)' if is_speaker_disjoint else 'FAILED (Overlap Detected)'}")
    print(f"Train/Dev Speaker Overlap: {len(train_dev_overlap)}")
    print(f"Train/Eval Speaker Overlap: {len(train_eval_overlap)}")
    print(f"Sample Path Integrity: {audit_results['path_sample_check']['sample_path_validity_percent']}% valid")
    print("=" * 60 + "\n")

    return audit_results


if __name__ == "__main__":
    run_dataset_audit()
