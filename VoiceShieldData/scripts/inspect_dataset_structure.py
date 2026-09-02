import os
import pandas as pd
from pathlib import Path

print("=== DETAILED DATASET PHYSICAL PATHS ===")

ds = Path("datasets")
for root, dirs, files in os.walk(ds):
    level = root.replace(str(ds), '').count(os.sep)
    if level <= 3:
        audio_files = [f for f in files if f.endswith(('.flac', '.wav', '.mp3', '.webm', '.csv', '.txt'))]
        print(f"{'  '*level}Folder: {root}")
        print(f"{'  '*level}  Dirs: {dirs[:5]}")
        print(f"{'  '*level}  Files ({len(files)} total, {len(audio_files)} audio/meta): {audio_files[:5]}")

print("\n=== CHECKING FIRST FEW ROWS OF IN-THE-WILD META.CSV ===")
itw_meta = ds / "in_the_wild" / "EXTRACTED" / "release_in_the_wild" / "meta.csv"
if itw_meta.exists():
    df_itw = pd.read_csv(itw_meta)
    print(f"ITW meta rows: {len(df_itw)}")
    print(f"ITW columns: {list(df_itw.columns)}")
    print(df_itw.head(5))
    print("Label distribution in ITW:")
    print(df_itw['label'].value_counts())
    if 'speaker' in df_itw.columns:
        print(f"Unique speakers in ITW: {df_itw['speaker'].nunique()}")

print("\n=== CHECKING ASVSPOOF 2019 PROTOCOLS ===")
for proto in ds.rglob("*.txt"):
    print(f"Found protocol file: {proto} ({proto.stat().st_size} bytes)")
    with open(proto, 'r', errors='ignore') as f:
        lines = [f.readline().strip() for _ in range(3)]
        print(f"  First 3 lines:\n    " + "\n    ".join(lines))
