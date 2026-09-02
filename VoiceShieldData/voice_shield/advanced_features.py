"""Fixed-size LFCC, phase, prosody, and spectral features for anti-spoofing."""
from __future__ import annotations

from pathlib import Path

import librosa
import numpy as np
from scipy.fft import dct
from scipy.signal import get_window

from .preprocessing import load_audio_safe


DEFAULT_SR = 16000
DEFAULT_SAMPLES = DEFAULT_SR * 4
N_FFT = 512
HOP_LENGTH = 160
WIN_LENGTH = 400
TARGET_FRAMES = 401


def _linear_filterbank(sr: int, n_fft: int, bands: int) -> np.ndarray:
    freqs = np.linspace(0.0, sr / 2.0, n_fft // 2 + 1)
    points = np.linspace(0.0, sr / 2.0, bands + 2)
    bank = np.zeros((bands, len(freqs)), dtype=np.float32)
    for index in range(bands):
        left, center, right = points[index : index + 3]
        bank[index] = np.maximum(
            0.0,
            np.minimum((freqs - left) / (center - left + 1e-8), (right - freqs) / (right - center + 1e-8)),
        )
    return bank


def _delta(values: np.ndarray) -> np.ndarray:
    padded = np.pad(values, ((0, 0), (2, 2)), mode="edge")
    return (padded[:, 4:] - padded[:, :-4] + 2.0 * (padded[:, 3:-1] - padded[:, 1:-3])) / 10.0


def _modified_group_delay(stft: np.ndarray, gamma: float = 0.4, cepstral_order: int = 24) -> np.ndarray:
    """Compute a cepstrally smoothed modified group-delay representation."""
    magnitude = np.abs(stft) + 1e-8
    phase_derivative = np.gradient(np.unwrap(np.angle(stft), axis=0), axis=0)
    raw_delay = np.real(stft) * phase_derivative + np.imag(stft) * np.gradient(np.log(magnitude), axis=0)
    denominator = np.power(magnitude, 2.0 * gamma)
    delay = raw_delay / denominator
    cepstrum = np.fft.irfft(np.log(magnitude), axis=0)
    cepstrum[cepstral_order:-cepstral_order, :] = 0.0
    smooth_log_magnitude = np.fft.rfft(cepstrum, axis=0).real
    return np.sign(delay) * np.log1p(np.abs(delay)) * np.exp(-0.1 * np.abs(smooth_log_magnitude))


def _fit_frames(values: np.ndarray, frames: int = TARGET_FRAMES) -> np.ndarray:
    if values.shape[1] < frames:
        return np.pad(values, ((0, 0), (0, frames - values.shape[1])), mode="edge")
    return values[:, :frames]


def extract_advanced_features(
    audio_path: str | Path | bytes,
    sr: int = DEFAULT_SR,
    target_samples: int = DEFAULT_SAMPLES,
    target_frames: int = TARGET_FRAMES,
    flatten: bool = True,
) -> np.ndarray:
    """Return a fixed-size normalized feature array for one audio recording."""
    y = load_audio_safe(audio_path, sr=sr, target_samples=target_samples)
    window = get_window("hann", WIN_LENGTH, fftbins=True).astype(np.float32)
    stft = librosa.stft(y, n_fft=N_FFT, hop_length=HOP_LENGTH, win_length=WIN_LENGTH, window=window, center=True)
    magnitude = np.abs(stft)
    power = magnitude ** 2

    filterbank = _linear_filterbank(sr, N_FFT, 24)
    lfcc = dct(np.log(np.maximum(filterbank @ power, 1e-10)), type=2, axis=0, norm="ortho")[:20]
    lfcc = np.concatenate((lfcc, _delta(lfcc), _delta(_delta(lfcc))), axis=0)

    mgd = _modified_group_delay(stft)
    mgd_bins = np.linspace(1, mgd.shape[0] - 1, 24, dtype=int)
    mgd = mgd[mgd_bins]

    contrast = librosa.feature.spectral_contrast(S=magnitude, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH)
    chroma = librosa.feature.chroma_stft(S=power, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH)
    f0 = librosa.yin(y, fmin=60.0, fmax=500.0, sr=sr, frame_length=WIN_LENGTH, hop_length=HOP_LENGTH)
    voiced = np.isfinite(f0) & (f0 > 0)
    f0_clean = np.where(voiced, f0, 0.0).astype(np.float32)
    voiced_f0 = f0[voiced]
    jitter = np.zeros_like(f0_clean)
    if len(voiced_f0) > 1:
        differences = np.abs(np.diff(voiced_f0)) / (voiced_f0[:-1] + 1e-6)
        jitter[1:][voiced[1:]] = np.pad(differences, (max(0, len(f0_clean) - 1 - len(differences)), 0))[: np.sum(voiced[1:])]
    f0_stats = np.vstack((f0_clean / 500.0, jitter, voiced.astype(np.float32)))

    features = np.concatenate((lfcc, mgd, contrast, chroma, f0_stats), axis=0)
    features = _fit_frames(features, target_frames)
    features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)
    features = (features - features.mean(axis=1, keepdims=True)) / (features.std(axis=1, keepdims=True) + 1e-6)
    return features.reshape(-1) if flatten else features


__all__ = ["extract_advanced_features", "DEFAULT_SR", "DEFAULT_SAMPLES", "TARGET_FRAMES"]
