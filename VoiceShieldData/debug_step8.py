import sys
import time
import pandas as pd
import torch
from torch.utils.data import DataLoader
sys.path.insert(0, r"F:\VoiceShieldData")

from voice_shield.dataset import iter_rows_by_split, BASE_DIR
from voice_shield.train import AudioDataset, _extract_feature

print("Loading manifest...")
manifest_path = BASE_DIR / "manifests" / "dataset_manifest.csv"
manifest = pd.read_csv(manifest_path)
split_rows = iter_rows_by_split(manifest)
train_rows = split_rows["train"]

print()
print("=" * 60)
print("PERFORMANCE BENCHMARK")
print("=" * 60)
print()

for n_samples in [1, 5, 20]:
    print(f"\n--- Benchmark: {n_samples} audio files ---")
    print()
    
    # Create dataset
    start = time.time()
    dataset = AudioDataset(train_rows, max_samples=n_samples)
    elapsed = time.time() - start
    print(f"Dataset creation (file check): {elapsed:.4f} sec")
    
    # Feature extraction on first sample
    start = time.time()
    feature_1, label_1 = dataset[0]
    elapsed_feat = time.time() - start
    print(f"1st feature extraction: {elapsed_feat:.4f} sec")
    
    # Cache should help for 2nd
    start = time.time()
    feature_2, label_2 = dataset[1] if len(dataset) > 1 else (None, None)
    elapsed_feat_2 = time.time() - start
    if feature_2 is not None:
        print(f"2nd feature extraction (if cached): {elapsed_feat_2:.4f} sec")
    
    # DataLoader with batch_size=2
    start = time.time()
    loader = DataLoader(dataset, batch_size=2, shuffle=False, num_workers=0)
    elapsed = time.time() - start
    print(f"DataLoader creation: {elapsed:.4f} sec")
    
    # Measure data loading and forward pass time
    start = time.time()
    batch_count = 0
    for batch_features, batch_labels in loader:
        batch_count += 1
    elapsed = time.time() - start
    avg_per_sample = elapsed / n_samples
    print(f"Total data loading ({n_samples} samples): {elapsed:.4f} sec")
    print(f"  > Average per sample: {avg_per_sample:.4f} sec")
    print(f"  > Estimated time for 100 samples: {avg_per_sample * 100:.2f} sec")
    print(f"  > Estimated time for 1000 samples: {avg_per_sample * 1000:.2f} sec")

print()
print("=" * 60)
print("BOTTLENECK ANALYSIS")
print("=" * 60)
print()
print("⚠️  Main bottleneck: Feature extraction (librosa melspectrogram)")
print("   - Single file: ~19-20 seconds")
print("   - CPU-only execution (CUDA not available)")
print()
print("SOLUTION CANDIDATES:")
print("1. Cache extracted features to disk (avoid recomputation)")
print("2. Use faster librosa backends (e.g., scipy instead of numpy)")
print("3. Parallelize feature extraction (multiprocessing)")
print("4. Use GPU acceleration (requires CUDA PyTorch installation)")
