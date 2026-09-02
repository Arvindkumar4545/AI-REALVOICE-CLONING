#!/usr/bin/env python
"""
Quick diagnosis: Score distribution on actual test samples
"""
import pandas as pd
import numpy as np
from pathlib import Path
import sys
sys.path.insert(0, r'F:\VoiceShieldData')

from voice_shield.inference import VoiceShieldInferenceEngine

# Load manifest
df = pd.read_csv('manifests/dataset_manifest.csv')

print("="*80)
print("QUICK DIAGNOSIS: ACTUAL SCORE DISTRIBUTION")
print("="*80)
print()

print("Data composition:")
for label in ['bonafide', 'spoof']:
    count = len(df[df['label'] == label])
    pct = 100 * count / len(df)
    print(f"  {label:10s}: {count:6d} ({pct:5.1f}%)")
print()

print("By split:")
for split in ['train', 'dev', 'test']:
    subset = df[df['split'] == split]
    if len(subset) == 0:
        continue
    counts = subset['label'].value_counts()
    bona = counts.get('bonafide', 0)
    spoof = counts.get('spoof', 0)
    print(f"  {split}: bonafide={bona:5d} spoof={spoof:5d} total={len(subset):6d}")
print()

# Test on actual files
print("Testing inference on 20 random dev samples...")
print()

dev_df = df[df['split'] == 'dev'].sample(min(20, len(df[df['split'] == 'dev'])), random_state=42)

engine = VoiceShieldInferenceEngine.get_instance()

bonafide_scores = []
spoof_scores = []

for idx, row in dev_df.iterrows():
    file_path = Path('datasets') / row['file']
    label = row['label']
    
    # Try to find the actual file
    if not file_path.exists():
        for ext in ['.wav', '.mp3', '.flac', '.ogg']:
            test_path = file_path.parent / (file_path.name + ext)
            if test_path.exists():
                file_path = test_path
                break
    
    if file_path.exists():
        try:
            result = engine.detect(str(file_path))
            score = result.get('spoof_probability', 0.5)
            classification = result.get('classification', 'UNKNOWN')
            
            if label == 'bonafide':
                bonafide_scores.append(score)
            else:
                spoof_scores.append(score)
            
            print(f"  {label:10s} | Risk: {score*100:5.1f}% | Class: {classification:12s}")
        except Exception as e:
            print(f"  {label:10s} | ERROR: {str(e)[:50]}")
    else:
        print(f"  {label:10s} | File not found")

print()
print("STATISTICS:")
print()

if bonafide_scores:
    print(f"Bonafide (real voice) - {len(bonafide_scores)} samples:")
    print(f"  Mean: {np.mean(bonafide_scores)*100:.1f}%")
    print(f"  Median: {np.median(bonafide_scores)*100:.1f}%")
    print(f"  Std: {np.std(bonafide_scores)*100:.1f}%")
    print(f"  Range: [{np.min(bonafide_scores)*100:.1f}%, {np.max(bonafide_scores)*100:.1f}%]")
    print()

if spoof_scores:
    print(f"Spoof (cloned voice) - {len(spoof_scores)} samples:")
    print(f"  Mean: {np.mean(spoof_scores)*100:.1f}%")
    print(f"  Median: {np.median(spoof_scores)*100:.1f}%")
    print(f"  Std: {np.std(spoof_scores)*100:.1f}%")
    print(f"  Range: [{np.min(spoof_scores)*100:.1f}%, {np.max(spoof_scores)*100:.1f}%]")
    
    # Count false negatives
    false_neg = sum(1 for s in spoof_scores if s < 0.65)
    print(f"  False negatives (risk < 65%): {false_neg}/{len(spoof_scores)}")

print()
print("="*80)
print("KEY OBSERVATION:")
print("  If spoof scores cluster around 40-60%, threshold recalibration may help")
print("  If spoof scores are genuinely low (<0.5 mean), model retraining needed")
print("="*80)
