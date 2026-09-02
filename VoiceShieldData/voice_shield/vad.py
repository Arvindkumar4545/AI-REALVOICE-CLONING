"""
VoiceShield Voice Activity Detection (VAD) & Audio Quality Gating Module (Phase 6)
Analyzes input waveforms to prevent unvoiced silence, low SNR, clipping, or corrupted
audio from falsely triggering acoustic deepfake artifact detectors.
"""
from __future__ import annotations

from typing import Dict, Any, Tuple, List
import numpy as np
import torch


def compute_audio_quality_metrics(
    waveform: torch.Tensor | np.ndarray,
    sr: int = 16000,
    frame_len_ms: int = 30,
    hop_len_ms: int = 15,
) -> Dict[str, Any]:
    """
    Computes physical signal quality and speech activity indicators:
    - Overall duration
    - Active speech duration
    - SNR estimate
    - Clipping ratio
    - Silence fraction
    """
    if isinstance(waveform, torch.Tensor):
        wave = waveform.detach().cpu().numpy().flatten()
    else:
        wave = np.asarray(waveform).flatten()

    total_samples = len(wave)
    total_duration_sec = total_samples / float(sr)

    # 1. Reject sub-0.5s audio
    if total_duration_sec < 0.50:
        return {
            "speech_detected": False,
            "duration_seconds": round(total_duration_sec, 2),
            "speech_duration_seconds": 0.0,
            "silence_fraction": 1.0,
            "snr_db": 0.0,
            "clipping_detected": False,
            "is_sufficient": False,
            "duration_tier": "INSUFFICIENT",
            "message": f"Audio is too short for reliable analysis ({total_duration_sec:.2f}s; minimum 0.5s required).",
        }

    # Clipping detection: sample values at peak boundaries (>0.985 or <-0.985)
    peak_val = np.max(np.abs(wave)) if len(wave) > 0 else 0.0
    clipping_count = np.sum(np.abs(wave) >= 0.985)
    clipping_ratio = clipping_count / float(total_samples) if total_samples > 0 else 0.0
    is_clipped = bool(clipping_ratio > 0.05)

    # Frame-level energy for VAD
    frame_len = int(sr * (frame_len_ms / 1000.0))
    hop_len = int(sr * (hop_len_ms / 1000.0))
    num_frames = max(1, (total_samples - frame_len) // hop_len + 1)

    frame_energies = []
    for i in range(num_frames):
        start = i * hop_len
        end = start + frame_len
        frame = wave[start:end]
        energy = np.mean(frame ** 2)
        frame_energies.append(energy)

    frame_energies = np.array(frame_energies)
    max_energy = np.max(frame_energies) if len(frame_energies) > 0 else 0.0

    if max_energy < 1e-4:
        # Near complete silence
        return {
            "speech_detected": False,
            "duration_seconds": round(total_duration_sec, 2),
            "speech_duration_seconds": 0.0,
            "silence_fraction": 1.0,
            "snr_db": 0.0,
            "clipping_detected": False,
            "is_sufficient": False,
            "duration_tier": "INSUFFICIENT",
            "message": "Audio contains only background silence. No active speech detected.",
        }

    # Adaptive energy threshold (18dB below max energy)
    vad_threshold = max(1e-5, max_energy * 0.02)
    speech_frames = frame_energies > vad_threshold
    active_frames = np.sum(speech_frames)
    speech_duration_sec = float(active_frames * hop_len / float(sr))
    silence_fraction = 1.0 - (speech_duration_sec / max(0.01, total_duration_sec))

    # SNR Estimation
    speech_energy = np.mean(frame_energies[speech_frames]) if active_frames > 0 else 1e-6
    noise_energy = np.mean(frame_energies[~speech_frames]) if np.sum(~speech_frames) > 0 else 1e-6
    snr_db = float(10.0 * np.log10(max(1e-4, speech_energy) / max(1e-6, noise_energy)))

    # Duration Tiers
    if total_duration_sec < 0.50 or speech_duration_sec < 0.30:
        duration_tier = "INSUFFICIENT"
        is_sufficient = False
        message = "Audio contains insufficient active speech duration (<0.5s)."
    elif total_duration_sec < 2.0 or speech_duration_sec < 0.8:
        duration_tier = "LOW_INFORMATION"
        is_sufficient = True
        message = "Short audio clip (0.5-2.0s); confidence is limited."
    elif total_duration_sec < 4.0:
        duration_tier = "LIMITED_CONFIDENCE"
        is_sufficient = True
        message = None
    else:
        duration_tier = "NORMAL"
        is_sufficient = True
        message = None

    if silence_fraction >= 0.95:
        is_sufficient = False
        message = "Audio contains excessive silence (>95%)."

    return {
        "speech_detected": bool(active_frames > 0),
        "duration_seconds": round(total_duration_sec, 2),
        "speech_duration_seconds": round(speech_duration_sec, 2),
        "silence_fraction": round(silence_fraction, 2),
        "snr_db": round(snr_db, 1),
        "clipping_detected": is_clipped,
        "is_sufficient": is_sufficient,
        "duration_tier": duration_tier,
        "message": message,
    }


def extract_voiced_waveform(
    waveform: torch.Tensor | np.ndarray,
    sr: int = 16000,
) -> torch.Tensor:
    """
    Trims silence and extracts continuous voiced audio waveform.
    If speech is minimal, returns standardized waveform with fallback padding.
    """
    if isinstance(waveform, np.ndarray):
        wave = torch.from_numpy(waveform).float()
    else:
        wave = waveform.clone().float()

    wave_flat = wave.flatten()
    metrics = compute_audio_quality_metrics(wave_flat, sr=sr)

    # If completely empty or silent, return original
    if not metrics["speech_detected"]:
        return wave_flat

    # Frame-level trimming
    frame_len = int(sr * 0.030)
    hop_len = int(sr * 0.015)
    total_samples = len(wave_flat)
    num_frames = max(1, (total_samples - frame_len) // hop_len + 1)

    frame_energies = []
    for i in range(num_frames):
        s = i * hop_len
        e = s + frame_len
        frame_energies.append(torch.mean(wave_flat[s:e] ** 2).item())

    max_energy = max(frame_energies) if frame_energies else 0.0
    vad_threshold = max(1e-5, max_energy * 0.02)

    voiced_samples = []
    for i, e in enumerate(frame_energies):
        if e > vad_threshold:
            s = i * hop_len
            end_s = min(total_samples, s + hop_len)
            voiced_samples.append(wave_flat[s:end_s])

    if voiced_samples:
        return torch.cat(voiced_samples)
    return wave_flat
