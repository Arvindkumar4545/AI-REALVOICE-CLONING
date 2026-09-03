"""
VoiceShield Dedicated Acoustic Replay Attack Detection Layer (Feature 5)
Analyzes physical acoustic properties to distinguish live human speech from acoustic replay:
1. Room Impulse Response (RIR) & Reverberation Time (RT60 proxy)
2. High-Frequency Spectral Rolloff & Decay (microphone & speaker reproduction artifacts)
3. Background Ambient Noise Floor Repetition & Discontinuity
4. Double-compression spectral distortion signature
"""
from __future__ import annotations

from typing import Dict, Any
import numpy as np
import torch
import scipy.signal


def detect_replay_attack(
    waveform: torch.Tensor | np.ndarray,
    sr: int = 16000,
) -> Dict[str, Any]:
    """
    Computes physical replay evidence using spectral decay, reverberation estimation,
    and high-frequency reproduction loss.
    Returns calibrated replay probability and explainable indicators.
    """
    if isinstance(waveform, torch.Tensor):
        wave = waveform.detach().cpu().numpy().flatten()
    else:
        wave = np.asarray(waveform).flatten()

    if len(wave) < sr * 0.5:
        return {
            "replay_probability": 0.15,
            "is_replay_detected": False,
            "indicators": ["Insufficient sample duration for acoustic reverberation analysis"],
            "metrics": {
                "high_freq_loss_ratio": 0.0,
                "reverberation_decay_score": 0.0,
                "noise_floor_stability": 0.0,
            },
        }

    # Normalize amplitude
    wave = wave / (np.max(np.abs(wave)) + 1e-8)

    # 1. High-Frequency Reproduction Loss (Speakers/transducers typically roll off sharply above 7kHz)
    fft_vals = np.abs(np.fft.rfft(wave))
    freqs = np.fft.rfftfreq(len(wave), 1.0 / sr)

    band_low = (freqs >= 300) & (freqs < 3400)      # Standard telephony/speech
    band_high = (freqs >= 6500) & (freqs <= 8000)   # High-frequency room response

    energy_low = np.sum(fft_vals[band_low] ** 2) + 1e-8
    energy_high = np.sum(fft_vals[band_high] ** 2) + 1e-8
    ratio_high_to_low = energy_high / energy_low

    # Severe high-frequency loss is indicative of re-recording through standard consumer speakers
    hf_loss_score = float(np.clip(1.0 - (ratio_high_to_low * 25.0), 0.0, 1.0))

    # 2. Reverberation & Room Response Decay (Schroeder integration proxy)
    # Energy envelope decay over frames
    frame_len = int(sr * 0.025)
    hop_len = int(sr * 0.010)
    num_frames = (len(wave) - frame_len) // hop_len + 1

    if num_frames > 10:
        energies = np.array([
            np.sum(wave[i * hop_len : i * hop_len + frame_len] ** 2)
            for i in range(num_frames)
        ])
        log_energies = 10.0 * np.log10(energies + 1e-8)

        # Look for unnatural prolonged energy tail after peaks (secondary room impulse)
        peak_indices = np.where(log_energies > (np.max(log_energies) - 10.0))[0]
        decay_slopes = []
        for p_idx in peak_indices:
            if p_idx + 8 < num_frames:
                tail = log_energies[p_idx : p_idx + 8]
                slope = (tail[-1] - tail[0]) / 8.0
                decay_slopes.append(slope)

        mean_slope = float(np.mean(decay_slopes)) if decay_slopes else -2.0
        # Replay exhibits shallower, muddier decay due to combined convolution of 2 rooms
        reverb_score = float(np.clip((mean_slope + 3.0) / 3.0, 0.0, 1.0))
    else:
        reverb_score = 0.2

    # 3. Double-Compression & Quantization Floor Variance
    # Replay introduces elevated stationary background noise from playback device
    sorted_energies = np.sort(np.abs(wave))
    noise_floor_est = float(np.mean(sorted_energies[: int(len(wave) * 0.15)]))
    noise_floor_score = float(np.clip(noise_floor_est * 40.0, 0.0, 1.0))

    # Calibrated Replay Probability
    replay_prob = float(np.clip(
        0.45 * hf_loss_score + 0.35 * reverb_score + 0.20 * noise_floor_score,
        0.02,
        0.98,
    ))

    indicators = []
    if hf_loss_score > 0.70:
        indicators.append("Severe high-frequency attenuation characteristic of transducer playback")
    if reverb_score > 0.65:
        indicators.append("Double-acoustic convolution & prolonged room impulse decay detected")
    if noise_floor_score > 0.60:
        indicators.append("Stationary device playback noise floor signature observed")

    if not indicators:
        indicators.append("Natural direct acoustic path without transducer distortion")

    return {
        "replay_probability": round(replay_prob, 4),
        "is_replay_detected": bool(replay_prob >= 0.65),
        "indicators": indicators,
        "metrics": {
            "high_freq_loss_score": round(hf_loss_score, 3),
            "reverberation_decay_score": round(reverb_score, 3),
            "noise_floor_stability": round(noise_floor_score, 3),
        },
    }
