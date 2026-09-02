import sys
import time
import pandas as pd
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.dataset import iter_rows_by_split, BASE_DIR
from voice_shield.train import AudioDataset

print("Loading manifest...")
manifest_path = BASE_DIR / "manifests" / "dataset_manifest.csv"
manifest = pd.read_csv(manifest_path)
print(f"Manifest loaded: {len(manifest)} rows")
print()

print("Splitting by split...")
split_rows = iter_rows_by_split(manifest)
train_rows = split_rows["train"]
dev_rows = split_rows["dev"]

print(f"Train rows: {len(train_rows)}")
print(f"Dev rows: {len(dev_rows)}")
print()

print("Creating AudioDataset with max 5 train and 5 dev samples...")
start = time.time()
train_dataset = AudioDataset(train_rows, max_samples=5)
elapsed_train = time.time() - start

print(f"Train dataset created in {elapsed_train:.2f} seconds")
print(f"Train dataset size: {len(train_dataset)}")
print()

start = time.time()
dev_dataset = AudioDataset(dev_rows, max_samples=5)
elapsed_dev = time.time() - start

print(f"Dev dataset created in {elapsed_dev:.2f} seconds")
print(f"Dev dataset size: {len(dev_dataset)}")
print()

print("Sampling one training batch...")
try:
    feature, label = train_dataset[0]
    print(f"Feature shape: {feature.shape}, dtype: {feature.dtype}")
    print(f"Label: {label.item()}")
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
