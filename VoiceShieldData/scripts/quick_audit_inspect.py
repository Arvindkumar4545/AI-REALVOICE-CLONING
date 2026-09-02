import os
import sys
import json
import pandas as pd
from pathlib import Path

# Ensure unbuffered
sys.stdout.reconfigure(line_buffering=True)

print("=== 1. MANIFEST INSPECTION ===", flush=True)

m1 = Path("manifests/dataset_manifest.csv")
if m1.exists():
    print(f"\n--- Loading {m1} ---", flush=True)
    df1 = pd.read_csv(m1)
    print(f"Total rows: {len(df1):,}")
    print(f"Columns: {list(df1.columns)}")
    print(f"Label counts:\n{df1['label'].value_counts().to_dict()}")
    if 'split' in df1.columns:
        print("Split x Label counts:")
        print(pd.crosstab(df1['split'], df1['label']))
    if 'source' in df1.columns:
        print(f"Source counts:\n{df1['source'].value_counts().to_dict()}")
    
    # Check first 5 file paths and verify if they exist on disk
    print("\nChecking first 10 file paths existence:")
    for idx, row in df1.head(10).iterrows():
        fpath = Path(row['file'])
        # Also try relative to datasets/
        fpath_datasets = Path("datasets") / row['file']
        exists_raw = fpath.exists()
        exists_ds = fpath_datasets.exists()
        print(f"  {row['file']} -> raw: {exists_raw}, in datasets/: {exists_ds}")

m2 = Path("manifests/speaker_disjoint_manifest.csv")
if m2.exists():
    print(f"\n--- Loading {m2} ---", flush=True)
    df2 = pd.read_csv(m2)
    print(f"Total rows: {len(df2):,}")
    print(f"Columns: {list(df2.columns)}")
    print(f"Label counts:\n{df2['label'].value_counts().to_dict()}")
    if 'split' in df2.columns:
        print("Split x Label counts:")
        print(pd.crosstab(df2['split'], df2['label']))
    if 'source' in df2.columns:
        print(f"Source counts:\n{df2['source'].value_counts().to_dict()}")

print("\n=== 2. DATASETS DIRECTORY CHECK ===", flush=True)
ds_dir = Path("datasets")
for item in ds_dir.iterdir():
    print(f"  {item.name}: is_dir={item.is_dir()}")
    if item.is_dir():
        subdirs = [p.name for p in item.iterdir() if p.is_dir()][:10]
        subfiles = [p.name for p in item.iterdir() if p.is_file()][:10]
        print(f"    Subdirs ({len(list(item.glob('*/')))}): {subdirs}")
        print(f"    Sample direct files: {subfiles}")

print("\n=== 3. SEARCHING FOR KNOWN FAILING SAMPLE 05a90ab3 ===", flush=True)
target_name = "05a90ab3-a28b-4d0e-83d6-3f0246f07444.mp3"
found = False
for search_root in [Path("datasets"), Path("backend"), Path("real_world_tests"), Path("tests"), Path("evaluation"), Path("reports")]:
    if search_root.exists():
        for f in search_root.rglob("*" + target_name.split(".")[0] + "*"):
            print(f"  FOUND: {f} (size: {f.stat().st_size} bytes)")
            found = True
if not found:
    print(f"  Sample {target_name} not found in repository standard folders.")
    # Check if any audio files exist in real_world_tests or backend/uploads
    for folder in [Path("real_world_tests"), Path("backend/uploads"), Path("backend/temp"), Path("tests")]:
        if folder.exists():
            files = list(folder.rglob("*"))
            print(f"  Files in {folder}: {[str(x) for x in files if x.is_file()]}")

print("\n=== 4. ACTIVE EXPERIMENTS & CHECKPOINTS ===", flush=True)
exp_dir = Path("experiments")
for item in exp_dir.iterdir():
    if item.is_dir():
        pts = list(item.glob("*.pt")) + list(item.glob("*.pth")) + list(item.glob("*.json"))
        print(f"  {item.name}: {[p.name for p in pts]}")

print("\n=== 5. CALIBRATION ARTIFACTS ===", flush=True)
for cal_p in [Path("model_artifacts/calibration.json"), Path("experiments/fusion/calibration.json"), Path("artifacts/calibration.json")]:
    if cal_p.exists():
        print(f"  {cal_p}:")
        try:
            with open(cal_p) as f:
                print(f"    {f.read()[:300]}")
        except Exception as e:
            print(f"    Error reading: {e}")

print("\nDONE INSPECTION STEP.", flush=True)
