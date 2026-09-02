"""
VoiceShield Feature Extraction Pipeline
Supports:
1. LFCC (Linear Frequency Cepstral Coefficients) with delta & delta-delta
2. Mel-Spectrogram (Log-Mel)
3. Raw Waveform chunking and normalization
4. Prosodic and acoustic feature extraction (F0, energy, ZCR, jitter, shimmer, spectral centroid/flux)
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Tuple, Dict, Any, List

import numpy as np
import scipy.signal
import soundfile as sf
import torch
import torch.nn.functional as F

TARGET_SR = 16000
DEFAULT_DURATION = 4.0  # 4 seconds = 64,000 samples at 16kHz
DEFAULT_SAMPLES = int(TARGET_SR * DEFAULT_DURATION)

from voice_shield.preprocessing import load_audio_safe

def load_and_standardize_audio(
    audio_path_or_bytes: str | Path | bytes,
    target_sr: int = TARGET_SR,
    target_samples: int = DEFAULT_SAMPLES,
) -> torch.Tensor:
    """
    Loads any audio format (FLAC, WAV, MP3, OGG, M4A) or raw bytes, resamples to target_sr,
    converts to mono, normalizes amplitude, and crops/pads to target_samples with complete error recovery.
    Returns tensor of shape [target_samples].
    """
    try:
        data = load_audio_safe(audio_path_or_bytes, sr=target_sr, target_samples=target_samples)
    except Exception:
        # Graceful fallback: return silent normalized array
        data = np.zeros(target_samples, dtype=np.float32)

    return torch.from_numpy(data.astype(np.float32))


# --------------------------------------------------------------------------
# 1. LFCC (Linear Frequency Cepstral Coefficients) Extractor
# --------------------------------------------------------------------------

def extract_lfcc(
    waveform: torch.Tensor,
    sr: int = TARGET_SR,
    n_fft: int = 512,
    hop_length: int = 160,
    win_length: int = 400,
    num_filterbanks: int = 20,
    num_ceps: int = 20,
    with_deltas: bool = True,
) -> torch.Tensor:
    """
    Extracts Linear Frequency Cepstral Coefficients (LFCC) for spectral artifact detection.
    Standard in ASVspoof community.
    Returns tensor of shape [C, F, T] where C=3 (static, delta, delta-delta), F=num_ceps, T=frames.
    """
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)  # [1, N]

    # STFT
    window = torch.hamming_window(win_length, device=waveform.device)
    stft = torch.stft(
        waveform,
        n_fft=n_fft,
        hop_length=hop_length,
        win_length=win_length,
        window=window,
        return_complex=True,
    )
    mag_spec = torch.abs(stft)  # [1, n_fft//2 + 1, T]

    # Linear filterbank
    n_freqs = n_fft // 2 + 1
    lin_points = np.linspace(0, sr / 2, num_filterbanks + 2)
    fft_freqs = np.linspace(0, sr / 2, n_freqs)
    
    filterbank = np.zeros((num_filterbanks, n_freqs), dtype=np.float32)
    for i in range(num_filterbanks):
        f_left = lin_points[i]
        f_center = lin_points[i + 1]
        f_right = lin_points[i + 2]
        
        # Rising slope
        slope_up = (fft_freqs - f_left) / (f_center - f_left + 1e-8)
        # Falling slope
        slope_down = (f_right - fft_freqs) / (f_right - f_center + 1e-8)
        
        filterbank[i] = np.maximum(0.0, np.minimum(slope_up, slope_down))

    fb_tensor = torch.from_numpy(filterbank).to(waveform.device)  # [num_filterbanks, n_freqs]
    
    # Filterbank energies
    fb_energies = torch.matmul(fb_tensor, mag_spec.squeeze(0))  # [num_filterbanks, T]
    log_fb = torch.log(torch.clamp(fb_energies, min=1e-6))  # [num_filterbanks, T]

    # Discrete Cosine Transform (DCT Type-II)
    n_m = num_filterbanks
    n_c = num_ceps
    dct_basis = np.zeros((n_c, n_m), dtype=np.float32)
    for k in range(n_c):
        for n in range(n_m):
            dct_basis[k, n] = math.cos(math.pi * k * (2 * n + 1) / (2 * n_m))
    dct_tensor = torch.from_numpy(dct_basis).to(waveform.device)
    
    static_lfcc = torch.matmul(dct_tensor, log_fb)  # [num_ceps, T]

    if not with_deltas:
        return static_lfcc.unsqueeze(0)  # [1, num_ceps, T]

    # Compute deltas and delta-deltas
    delta1 = compute_delta(static_lfcc)
    delta2 = compute_delta(delta1)
    
    # Stack [3, num_ceps, T]
    lfcc_3ch = torch.stack([static_lfcc, delta1, delta2], dim=0)
    return lfcc_3ch


def compute_delta(feat: torch.Tensor, n: int = 2) -> torch.Tensor:
    """Computes first-order regression delta coefficients along time axis (dim=-1)."""
    denom = 2 * sum(i ** 2 for i in range(1, n + 1))
    pad = F.pad(feat.unsqueeze(0), (n, n), mode="replicate").squeeze(0)
    delta = torch.zeros_like(feat)
    for i in range(1, n + 1):
        delta += i * (pad[..., n + i : n + i + feat.shape[-1]] - pad[..., n - i : n - i + feat.shape[-1]])
    return delta / denom


# --------------------------------------------------------------------------
# 2. Prosodic & Acoustic Feature Extractor (for BiLSTM Model)
# --------------------------------------------------------------------------

def extract_prosodic_features(
    waveform: torch.Tensor,
    sr: int = TARGET_SR,
    frame_length_ms: float = 25.0,
    hop_length_ms: float = 10.0,
) -> torch.Tensor:
    """
    Extracts time-series prosodic and spectral cues for deepfake detection:
    1. Short-Time Energy
    2. Zero-Crossing Rate (ZCR)
    3. F0 (Autocorrelation fundamental frequency estimation)
    4. Jitter proxy (F0 frame-to-frame delta variability)
    5. Shimmer proxy (Energy frame-to-frame delta variability)
    6. Spectral Centroid
    7. Spectral Flux
    8. Spectral Rolloff (85%)
    
    Returns tensor of shape [T, num_features] where num_features=8.
    """
    y = waveform.cpu().numpy()
    frame_len = int(sr * (frame_length_ms / 1000.0))
    hop_len = int(sr * (hop_length_ms / 1000.0))
    
    num_frames = max(1, (len(y) - frame_len) // hop_len + 1)
    features = np.zeros((num_frames, 8), dtype=np.float32)

    prev_spec = None
    prev_f0 = 100.0
    prev_energy = 1e-4

    for i in range(num_frames):
        start = i * hop_len
        end = start + frame_len
        frame = y[start:end]
        if len(frame) < frame_len:
            frame = np.pad(frame, (0, frame_len - len(frame)))

        # 1. Short-Time Energy
        energy = np.sum(frame ** 2) / frame_len
        log_energy = np.log1p(energy * 1000.0)

        # 2. Zero-Crossing Rate
        zcr = np.mean(np.abs(np.diff(np.sign(frame)))) / 2.0

        # 3. F0 via Autocorrelation
        corr = np.correlate(frame, frame, mode="full")[len(frame) - 1 :]
        min_lag = int(sr / 500)  # max F0 = 500 Hz
        max_lag = int(sr / 60)   # min F0 = 60 Hz
        if len(corr) > max_lag and np.max(corr[min_lag:max_lag]) > 0.3 * corr[0]:
            peak_lag = min_lag + np.argmax(corr[min_lag:max_lag])
            f0 = sr / peak_lag
        else:
            f0 = 0.0

        # 4. Jitter proxy (F0 deviation)
        jitter = abs(f0 - prev_f0) / (prev_f0 + 1e-5) if f0 > 0 and prev_f0 > 0 else 0.0
        if f0 > 0:
            prev_f0 = f0

        # 5. Shimmer proxy (Energy deviation)
        shimmer = abs(energy - prev_energy) / (prev_energy + 1e-5)
        prev_energy = energy

        # Spectrum
        fft_mag = np.abs(np.fft.rfft(frame * np.hamming(len(frame))))
        freqs = np.fft.rfftfreq(len(frame), d=1.0 / sr)
        mag_sum = np.sum(fft_mag) + 1e-8

        # 6. Spectral Centroid
        spectral_centroid = np.sum(freqs * fft_mag) / mag_sum

        # 7. Spectral Flux
        if prev_spec is not None:
            spectral_flux = np.sum((fft_mag - prev_spec) ** 2) / len(fft_mag)
        else:
            spectral_flux = 0.0
        prev_spec = fft_mag

        # 8. Spectral Rolloff (85%)
        cum_mag = np.cumsum(fft_mag)
        rolloff_idx = np.where(cum_mag >= 0.85 * mag_sum)[0]
        spectral_rolloff = freqs[rolloff_idx[0]] if len(rolloff_idx) > 0 else freqs[-1]

        features[i, 0] = log_energy
        features[i, 1] = zcr
        features[i, 2] = f0 / 500.0  # normalized F0
        features[i, 3] = min(jitter, 1.0)
        features[i, 4] = min(shimmer, 1.0)
        features[i, 5] = spectral_centroid / (sr / 2.0)
        features[i, 6] = np.log1p(spectral_flux)
        features[i, 7] = spectral_rolloff / (sr / 2.0)

    return torch.from_numpy(features)
