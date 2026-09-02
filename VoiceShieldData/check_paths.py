#!/usr/bin/env python
import pandas as pd
from pathlib import Path

df = pd.read_csv('manifests/dataset_manifest.csv')
print('Sample file paths from manifest:')
for idx, row in df.head(5).iterrows():
    print(f"  {row['file']}")
    
# Check what directories actually exist
print()
print('Checking dataset directories:')
for d in ['datasets', 'datasets/asvspoof2019', 'datasets/in_the_wild']:
    p = Path(d)
    if p.exists():
        contents = list(p.iterdir())[:3]
        print(f'  {d}: EXISTS, {len(list(p.iterdir()))} items')
    else:
        print(f'  {d}: NOT FOUND')

# Try to find actual audio files
print()
print('Looking for audio files in datasets directory:')
datasets_dir = Path('datasets')
if datasets_dir.exists():
    all_files = list(datasets_dir.rglob('*.wav'))[:5]
    print(f'Found {len(list(datasets_dir.rglob("*.wav")))} WAV files')
    print('First few:')
    for f in all_files:
        print(f'  {f}')
