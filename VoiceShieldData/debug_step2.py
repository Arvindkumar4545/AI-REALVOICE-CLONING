import librosa
import numpy as np
from pathlib import Path

test_file = r"F:\VoiceShieldData\datasets\asvspoof2019\LA\LA\ASVspoof2019_LA_train\flac\LA_T_1000137.flac"
print(f"Testing file: {test_file}")
print(f"File exists: {Path(test_file).exists()}")

try:
    y, sr = librosa.load(test_file, sr=16000, mono=True)
    print(f"Sample rate: {sr}")
    print(f"Channels: 1 (mono)")
    print(f"Duration: {len(y) / sr:.2f} seconds")
    print(f"Waveform shape: {y.shape}")
    print(f"Waveform dtype: {y.dtype}")
    print(f"Min: {np.min(y):.6f}")
    print(f"Max: {np.max(y):.6f}")
    print(f"NaN count: {np.isnan(y).sum()}")
    print(f"Inf count: {np.isinf(y).sum()}")
    print("SUCCESS: Audio file loaded")
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
