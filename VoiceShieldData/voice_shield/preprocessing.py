"""
VoiceShield Robust Audio Preprocessing & Acoustic Augmentation Pipeline
Supports WAV, FLAC, MP3, OGG, M4A with consistent feature extraction and telephony simulation.
"""
from __future__ import annotations

import io
import math
import random
from pathlib import Path
from typing import Tuple, Optional

import librosa
import numpy as np
import soundfile as sf
import torch
import torch.nn.functional as F


SAMPLE_RATE = 16000
DURATION_SECONDS = 4.0
TARGET_SAMPLES = int(SAMPLE_RATE * DURATION_SECONDS)  # 64,000 samples
N_MELS = 40
N_FFT = 512
HOP_LENGTH = 160
WIN_LENGTH = 400
FMIN = 20
FMAX = 8000
TARGET_FRAMES = 96


def decode_with_pyav(audio_source: str | Path | bytes | io.BytesIO, target_sr: int = SAMPLE_RATE) -> np.ndarray | None:
    """Decodes WebM, Opus, MP4, FLAC, WAV, MP3, etc. directly to 16kHz mono float32 using PyAV."""
    try:
        import av
        if isinstance(audio_source, (bytes, io.BytesIO)):
            bio = io.BytesIO(audio_source) if isinstance(audio_source, bytes) else audio_source
            bio.seek(0)  # Ensure we're at the start
            container = av.open(bio)
        else:
            container = av.open(str(audio_source))

        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if not audio_stream:
            container.close()
            return None

        resampler = av.AudioResampler(format="fltp", layout="mono", rate=target_sr)
        chunks = []
        for frame in container.decode(audio_stream):
            for resampled_frame in resampler.resample(frame):
                chunks.append(resampled_frame.to_ndarray())
        container.close()

        if chunks:
            arr = np.concatenate(chunks, axis=1).squeeze(0).astype(np.float32)
            return arr
        return None
    except Exception:
        return None


def load_audio_safe(
    audio_source: str | Path | bytes | io.BytesIO,
    sr: int = SAMPLE_RATE,
    target_samples: int = TARGET_SAMPLES,
) -> np.ndarray:
    """
    Safely decodes and resamples audio from file path, raw bytes, or BytesIO.
    Supports WAV, FLAC, MP3, OGG, M4A, WEBM, OPUS.
    Returns 1D float32 numpy array of length `target_samples` normalized to [-1.0, 1.0].
    """
    try:
        # 1. Try PyAV first (supports WebM, Opus, MP4, AAC, FLAC, WAV, OGG)
        y = decode_with_pyav(audio_source, target_sr=sr)

        # 2. Fallback to soundfile / librosa if PyAV didn't return an array
        if y is None:
            if isinstance(audio_source, (bytes, io.BytesIO)):
                bio = io.BytesIO(audio_source) if isinstance(audio_source, bytes) else audio_source
                y, file_sr = sf.read(bio, dtype="float32", always_2d=False)
                if y.ndim > 1:
                    y = np.mean(y, axis=1)
                if file_sr != sr:
                    y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
            else:
                y, _ = librosa.load(str(audio_source), sr=sr, mono=True)

        if not np.isfinite(y).all():
            y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)

        # Pad or truncate to fixed duration
        if len(y) < target_samples:
            y = np.pad(y, (0, target_samples - len(y)), mode="constant")
        else:
            y = y[:target_samples]

        return y.astype(np.float32)

    except Exception:
        # Return clean silence on corrupted audio to prevent crashing batch loaders
        return np.zeros(target_samples, dtype=np.float32)


# ==============================================================================
# ACOUSTIC AUGMENTATION PIPELINE
# ==============================================================================

def apply_audio_augmentation(
    y: np.ndarray,
    sr: int = SAMPLE_RATE,
    telephony_mode: bool = False,
    noise_prob: float = 0.4,
    gain_prob: float = 0.4,
    shift_prob: float = 0.4,
) -> np.ndarray:
    """
    Applies configurable physical acoustic augmentations for anti-spoofing robustness.
    """
    augmented = y.copy()

    # 1. Random Gain Variation (-6 dB to +6 dB)
    if random.random() < gain_prob:
        gain_factor = 10.0 ** (random.uniform(-6.0, 6.0) / 20.0)
        augmented = np.clip(augmented * gain_factor, -1.0, 1.0)

    # 2. Time Shift (Cyclic or zero-padded shift up to 0.2s)
    if random.random() < shift_prob:
        max_shift = int(sr * 0.2)
        shift = random.randint(-max_shift, max_shift)
        augmented = np.roll(augmented, shift)

    # 3. Additive Gaussian White / Pink Noise (SNR 15-35 dB)
    if random.random() < noise_prob:
        signal_power = np.mean(augmented ** 2) + 1e-9
        target_snr_db = random.uniform(15.0, 35.0)
        noise_power = signal_power / (10.0 ** (target_snr_db / 10.0))
        noise = np.random.normal(0, math.sqrt(noise_power), len(augmented))
        augmented = np.clip(augmented + noise, -1.0, 1.0)

    # 4. Telephony Degradation Mode (Band-Limitation, Packet-Loss Dropouts, Codec quantization)
    if telephony_mode or random.random() < 0.2:
        # Lowpass filter simulating 8kHz telephone bandwidth
        if random.random() < 0.6:
            augmented = librosa.effects.preemphasis(augmented, coef=0.90)

        # Simulated Packet-loss Dropouts (1-3 short temporal drops)
        if random.random() < 0.4:
            num_dropouts = random.randint(1, 3)
            for _ in range(num_dropouts):
                drop_len = random.randint(int(sr * 0.02), int(sr * 0.08))
                start_idx = random.randint(0, max(0, len(augmented) - drop_len))
                augmented[start_idx : start_idx + drop_len] = 0.0

    return augmented.astype(np.float32)


def apply_spec_augment(
    spec: torch.Tensor,
    time_mask_max: int = 12,
    freq_mask_max: int = 6,
) -> torch.Tensor:
    """
    Applies SpecAugment frequency and time masking to Mel-spectrogram tensors.
    Shape: [1, n_mels, n_frames]
    """
    augmented = spec.clone()
    _, n_mels, n_frames = augmented.shape

    # Frequency Masking
    if freq_mask_max > 0:
        f = random.randint(0, freq_mask_max)
        f0 = random.randint(0, n_mels - f)
        augmented[:, f0 : f0 + f, :] = 0.0

    # Time Masking
    if time_mask_max > 0:
        t = random.randint(0, time_mask_max)
        t0 = random.randint(0, n_frames - t)
        augmented[:, :, t0 : t0 + t] = 0.0

    return augmented


# ==============================================================================
# FEATURE EXTRACTION
# ==============================================================================

def extract_log_mel_spectrogram(
    audio: np.ndarray | str | Path | bytes,
    sr: int = SAMPLE_RATE,
    augment: bool = False,
    telephony_mode: bool = False,
) -> torch.Tensor:
    """
    Extracts 40-band Log-Mel Spectrogram standardized tensor [1, 40, 96].
    """
    if isinstance(audio, (str, Path, bytes, io.BytesIO)):
        y = load_audio_safe(audio, sr=sr)
    elif isinstance(audio, torch.Tensor):
        y = audio.detach().cpu().numpy().astype(np.float32)
    else:
        y = audio

    if augment:
        y = apply_audio_augmentation(y, sr=sr, telephony_mode=telephony_mode)

    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
        win_length=WIN_LENGTH,
        fmin=FMIN,
        fmax=FMAX,
    )
    log_mel = librosa.power_to_db(mel, ref=np.max)

    # Per-utterance mean/variance normalization
    std = float(np.std(log_mel))
    mean = float(np.mean(log_mel))
    log_mel = (log_mel - mean) / (std + 1e-6)

    tensor = torch.from_numpy(log_mel.astype(np.float32)).unsqueeze(0)

    # Ensure temporal frame dimension is exactly TARGET_FRAMES (96)
    if tensor.shape[-1] < TARGET_FRAMES:
        tensor = F.pad(tensor, (0, TARGET_FRAMES - tensor.shape[-1]))
    else:
        tensor = tensor[..., :TARGET_FRAMES]

    if augment and random.random() < 0.4:
        tensor = apply_spec_augment(tensor)

    return tensor


if __name__ == "__main__":
    dummy_wav = np.random.randn(64000).astype(np.float32)
    spec_clean = extract_log_mel_spectrogram(dummy_wav, augment=False)
    spec_aug = extract_log_mel_spectrogram(dummy_wav, augment=True, telephony_mode=True)
    print("Clean Spectrogram Shape:", spec_clean.shape)
    print("Augmented Spectrogram Shape:", spec_aug.shape)
