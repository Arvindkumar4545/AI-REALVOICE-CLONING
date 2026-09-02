#!/usr/bin/env python
"""
Step 1 Diagnosis: Analyze training data composition, calibration, and false negatives
"""
import pandas as pd
import numpy as np
from pathlib import Path
import sys
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.inference import VoiceShieldInferenceEngine
from sklearn.metrics import roc_curve, auc, precision_recall_curve

print("=" * 100)
print("STEP 1: COMPREHENSIVE DIAGNOSIS OF VOICE-CLONE DETECTION FALSE NEGATIVES")
print("=" * 100)
print()

# ============================================================================
# 1. TRAINING DATA COMPOSITION
# ============================================================================
print("1. TRAINING DATA COMPOSITION")
print("-" * 100)

manifest_path = Path("manifests/dataset_manifest.csv")
df = pd.read_csv(manifest_path)

# Overall class balance
label_counts = df['label'].value_counts()
print(f"\nOVERALL CLASS BALANCE:")
print(f"  Bonafide (real): {label_counts.get('bona_fide', 0):4d} ({100*label_counts.get('bona_fide',0)/len(df):.1f}%)")
print(f"  Spoof (cloned):  {label_counts.get('spoof', 0):4d} ({100*label_counts.get('spoof',0)/len(df):.1f}%)")
print(f"  IMBALANCE RATIO (Bonafide:Spoof): {label_counts.get('bona_fide',0) / (label_counts.get('spoof',0)+1):.2f}:1")

# By split
print(f"\nCLASS BALANCE BY SPLIT:")
for split in ['train', 'dev', 'test']:
    subset = df[df['split'] == split]
    if len(subset) == 0:
        continue
    label_counts = subset['label'].value_counts()
    total = len(subset)
    bona = label_counts.get('bona_fide', 0)
    spoof = label_counts.get('spoof', 0)
    spoof_pct = 100 * spoof / total if total > 0 else 0
    print(f"  {split.upper():6s}: {total:4d} samples | Bonafide: {bona:4d} ({100*bona/total:5.1f}%) | Spoof: {spoof:4d} ({spoof_pct:5.1f}%)")

# Dataset sources
print(f"\nDATA SOURCE DIVERSITY:")
if 'source' in df.columns:
    print(f"  Unique sources: {df['source'].nunique()}")
    print(f"  Source distribution:")
    for src, count in df['source'].value_counts().items():
        pct = 100 * count / len(df)
        print(f"    {src:20s}: {count:4d} ({pct:5.1f}%)")
else:
    print("  No 'source' column in manifest")

# Spoof engine diversity (infer from filenames/directories)
print(f"\nSPOOF ENGINE/TYPE DIVERSITY (inferred from filenames):")
spoof_df = df[df['label'] == 'spoof']
spoof_files = spoof_df['file'].values

# Try to identify TTS/cloning engine from path
engines = {}
for f in spoof_files:
    # Extract parent directory (often indicates engine)
    parts = str(f).replace("\\", "/").split("/")
    if len(parts) > 1:
        potential_engine = parts[-2]  # Parent directory
    else:
        potential_engine = "unknown"
    
    engines[potential_engine] = engines.get(potential_engine, 0) + 1

for engine, count in sorted(engines.items(), key=lambda x: -x[1]):
    pct = 100 * count / len(spoof_files)
    print(f"  {engine:20s}: {count:4d} ({pct:5.1f}%)")

print()

# ============================================================================
# 2. CURRENT MODEL THRESHOLDS & CALIBRATION
# ============================================================================
print("2. CURRENT DECISION THRESHOLDS & CALIBRATION")
print("-" * 100)

# Check fusion.py for thresholds
from pathlib import Path
fusion_path = Path("voice_shield/models/fusion.py")
if fusion_path.exists():
    with open(fusion_path) as f:
        content = f.read()
        # Look for threshold definitions
        if "threshold_lower" in content:
            print("\nThreshold definitions found in fusion.py:")
            # Extract relevant lines
            lines = content.split("\n")
            for i, line in enumerate(lines):
                if "threshold" in line.lower() and ("0.3" in line or "0.6" in line or "0.7" in line):
                    print(f"  Line {i}: {line.strip()}")
        if "UNCERTAIN" in content:
            print("\nUNCERTAIN band definition found")
            lines = content.split("\n")
            for i, line in enumerate(lines):
                if "UNCERTAIN" in line:
                    print(f"  Line {i}: {line.strip()}")

# Check model_artifacts for calibration
calib_path = Path("model_artifacts/calibration.json")
if calib_path.exists():
    import json
    with open(calib_path) as f:
        calib = json.load(f)
    print(f"\nCalibration file found:")
    print(f"  {json.dumps(calib, indent=2)}")

print()

# ============================================================================
# 3. SCORE DISTRIBUTION ANALYSIS ON VALIDATION SET
# ============================================================================
print("3. SCORE DISTRIBUTION ANALYSIS (Real vs. Cloned)")
print("-" * 80)

# Load the failing sample info
failing_sample_id = "05a90ab3-a28b-4d0e-83d6-3f0246f07444"
print(f"\nFailing sample ID: {failing_sample_id}")
print(f"  Reported risk score: 40.2% (UNCERTAIN band)")
print(f"  Expected: >65% (SPOOF band)")

# Analyze test/dev set score distributions
dev_subset = df[df['split'] == 'dev'].head(100)  # Sample for speed
print(f"\nAnalyzing score distribution on {len(dev_subset)} dev samples...")

engine = VoiceShieldInferenceEngine.get_instance()
real_scores = []
spoof_scores = []

for idx, row in dev_subset.iterrows():
    label = row['label']
    file_path = Path("datasets") / row['file']
    
    if not file_path.exists():
        continue
    
    try:
        result = engine.detect(str(file_path))
        score = result.get('spoof_probability', 0.5)
        classification = result.get('classification', 'UNCERTAIN')
        
        if label == 'bona_fide':
            real_scores.append((score, classification, str(file_path)))
        else:
            spoof_scores.append((score, classification, str(file_path)))
    except Exception as e:
        print(f"  Error on {file_path}: {e}")
        continue

# Statistics
if real_scores:
    real_scores_vals = [s[0] for s in real_scores]
    print(f"\nREAL VOICE SCORES (n={len(real_scores)}):")
    print(f"  Mean: {np.mean(real_scores_vals):.4f}")
    print(f"  Median: {np.median(real_scores_vals):.4f}")
    print(f"  Std: {np.std(real_scores_vals):.4f}")
    print(f"  Min: {np.min(real_scores_vals):.4f}")
    print(f"  Max: {np.max(real_scores_vals):.4f}")
    print(f"  Percentiles: 25%={np.percentile(real_scores_vals, 25):.4f}, 75%={np.percentile(real_scores_vals, 75):.4f}")
    
    # Count by classification
    real_classifications = [s[1] for s in real_scores]
    print(f"  Classifications: {dict((c, real_classifications.count(c)) for c in set(real_classifications))}")

if spoof_scores:
    spoof_scores_vals = [s[0] for s in spoof_scores]
    print(f"\nSPOOF VOICE SCORES (n={len(spoof_scores)}):")
    print(f"  Mean: {np.mean(spoof_scores_vals):.4f}")
    print(f"  Median: {np.median(spoof_scores_vals):.4f}")
    print(f"  Std: {np.std(spoof_scores_vals):.4f}")
    print(f"  Min: {np.min(spoof_scores_vals):.4f}")
    print(f"  Max: {np.max(spoof_scores_vals):.4f}")
    print(f"  Percentiles: 25%={np.percentile(spoof_scores_vals, 25):.4f}, 75%={np.percentile(spoof_scores_vals, 75):.4f}")
    
    # Count by classification
    spoof_classifications = [s[1] for s in spoof_scores]
    print(f"  Classifications: {dict((c, spoof_classifications.count(c)) for c in set(spoof_classifications))}")
    
    # Count false negatives (spoof with BONA_FIDE or UNCERTAIN classification)
    false_negs = [(s[0], s[2]) for s in spoof_scores if s[1] in ['BONA_FIDE', 'UNCERTAIN']]
    print(f"\n  FALSE NEGATIVES (spoof classified as BONA_FIDE/UNCERTAIN): {len(false_negs)}")
    if false_negs:
        print(f"    Risk scores of false negatives: {sorted([s[0] for s in false_negs])}")

print()
print("=" * 100)
print("DIAGNOSIS SUMMARY")
print("=" * 100)
print()
print("KEY FINDINGS:")
print()
print("Issue 1: CLASS IMBALANCE")
print(f"  → Check if spoof class is underrepresented in training data")
print()
print("Issue 2: ENGINE DIVERSITY")
print(f"  → Check if certain TTS/cloning engines are missing or underrepresented")
print()
print("Issue 3: SCORE CALIBRATION")
print(f"  → The 40.2% score suggests the model may not be discriminative enough")
print(f"  → OR thresholds are set too high/conservative")
print()
print("Issue 4: THRESHOLD PLACEMENT")
print(f"  → UNCERTAIN band (35-65%) may be too wide")
print(f"  → Consider narrowing or recalibrating based on score distribution")
print()

