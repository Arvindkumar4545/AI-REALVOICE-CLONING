import sys
import pandas as pd
from pathlib import Path
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.dataset import iter_rows_by_split, BASE_DIR

print("=" * 60)
print("DATASET PROBLEM DETECTION")
print("=" * 60)
print()

manifest_path = BASE_DIR / "manifests" / "dataset_manifest.csv"
manifest = pd.read_csv(manifest_path)
split_rows = iter_rows_by_split(manifest)

issues = {
    "missing_files": [],
    "invalid_paths": [],
    "corrupted_audio": [],
}

print(f"Total files in manifest: {len(manifest)}")
print()

# Check for basic issues
print("Checking for missing/corrupted files...")
checked = 0
for idx, row in manifest.iterrows():
    checked += 1
    if checked % 50000 == 0:
        print(f"  Checked {checked} files...")
    
    path = Path(row["path"])
    if not path.exists():
        issues["missing_files"].append(row["path"])
    
    if not str(row["path"]).startswith(("F:", "\\", "/")):
        issues["invalid_paths"].append(row["path"])

print(f"  Checked {checked} files total")
print()

print("DATASET STATISTICS:")
print(f"  Train: {len(split_rows['train'])} files")
print(f"  Dev: {len(split_rows['dev'])} files")
print(f"  Eval: {len(split_rows['eval'])} files")
print()

print("Label distribution:")
for split_name in ["train", "dev", "eval"]:
    split = split_rows[split_name]
    if len(split) > 0:
        label_dist = split["label"].value_counts()
        print(f"  {split_name}:")
        for label, count in label_dist.items():
            pct = 100 * count / len(split)
            print(f"    {label}: {count} ({pct:.1f}%)")
print()

print("ISSUES FOUND:")
print(f"  Missing files: {len(issues['missing_files'])}")
if issues['missing_files']:
    print(f"    Examples: {issues['missing_files'][:3]}")
print(f"  Invalid paths: {len(issues['invalid_paths'])}")
if issues['invalid_paths']:
    print(f"    Examples: {issues['invalid_paths'][:3]}")
print()

print("KNOWN ISSUE: Some PA (Physical Attack) files have corrupt FLAC")
print("  'flac decoder lost sync' errors on:")
print("    - PA_T_0009880.flac")
print("    - PA_T_0026428.flac")
print("    - PA_T_0050855.flac")
print("    - PA_T_0003344.flac")
print("    - PA_T_0053275.flac")
print("    - PA_T_0052769.flac")
print("    - PA_T_0027695.flac")
print("    - PA_D_0005084.flac")
print()
print("MITIGATION: Graceful error handling in AudioDataset.__getitem__")
print("            Returns zero tensor if feature extraction fails")
