import librosa
import numpy as np
import torch
import time
from pathlib import Path

test_file = r"F:\VoiceShieldData\datasets\asvspoof2019\LA\LA\ASVspoof2019_LA_train\flac\LA_T_1000137.flac"

def _extract_feature(file_path: str, sr: int = 16000) -> torch.Tensor:
    y, _ = librosa.load(file_path, sr=sr, mono=True)
    target_samples = sr * 4
    if len(y) < target_samples:
        y = np.pad(y, (0, target_samples - len(y)), mode="constant")
    else:
        y = y[:target_samples]

    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=40,
        n_fft=512,
        hop_length=160,
        win_length=400,
        fmin=20,
        fmax=8000,
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)
    log_mel = (log_mel - np.mean(log_mel)) / (np.std(log_mel) + 1e-6)
    feature = torch.from_numpy(log_mel.astype(np.float32)).unsqueeze(0)

    if feature.shape[-1] < 96:
        pad = 96 - feature.shape[-1]
        feature = torch.nn.functional.pad(feature, (0, pad))
    else:
        feature = feature[..., :96]

    return feature

print(f"Testing feature extraction on: {test_file}")
print()

try:
    start = time.time()
    feature = _extract_feature(test_file, sr=16000)
    elapsed = time.time() - start
    
    print(f"Feature shape: {feature.shape}")
    print(f"Feature dtype: {feature.dtype}")
    print(f"Min: {feature.min():.6f}")
    print(f"Max: {feature.max():.6f}")
    print(f"Mean: {feature.mean():.6f}")
    print(f"Std: {feature.std():.6f}")
    print(f"NaN count: {torch.isnan(feature).sum()}")
    print(f"Inf count: {torch.isinf(feature).sum()}")
    print(f"Processing time: {elapsed:.4f} seconds")
    print()
    print("SUCCESS: Feature extraction works")
    
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
