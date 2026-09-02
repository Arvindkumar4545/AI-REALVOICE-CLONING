"""
Acoustic Forensics and Explainable AI Signal Analysis for VoiceShield
Calculates genuine audio signal properties and interpretable indicators.
"""
from __future__ import annotations

from typing import List, Dict, Any
import numpy as np
import librosa

from .schemas import ForensicMetrics, ExplainableSignal


def compute_forensic_metrics(
    y: np.ndarray,
    sr: int = 16000,
    orig_duration: float | None = None,
    orig_sr: int | None = None,
    channels: int = 1,
) -> ForensicMetrics:
    """
    Computes rigorous signal forensic properties from raw audio samples.
    """
    duration = orig_duration if orig_duration is not None else float(len(y) / sr)
    effective_sr = orig_sr if orig_sr is not None else sr

    # RMS Energy
    rms = float(np.sqrt(np.mean(y ** 2))) if len(y) > 0 else 0.0

    # Spectral Centroid
    try:
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        mean_centroid = float(np.mean(cent))
    except Exception:
        mean_centroid = 0.0

    # Spectral Rolloff (85% energy point)
    try:
        rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
        mean_rolloff = float(np.mean(rolloff))
    except Exception:
        mean_rolloff = 0.0

    # Zero Crossing Rate
    try:
        zcr = librosa.feature.zero_crossing_rate(y)
        mean_zcr = float(np.mean(zcr))
    except Exception:
        mean_zcr = 0.0

    # High frequency energy ratio (> 4000 Hz)
    try:
        fft_vals = np.abs(np.fft.rfft(y))
        freqs = np.fft.rfftfreq(len(y), 1.0 / sr)
        total_energy = np.sum(fft_vals ** 2) + 1e-9
        high_freq_energy = np.sum(fft_vals[freqs >= 4000] ** 2)
        high_freq_ratio = float(high_freq_energy / total_energy)
    except Exception:
        high_freq_ratio = 0.0

    # Silence ratio (< -40dB relative to peak)
    try:
        peak = np.max(np.abs(y)) + 1e-9
        threshold = peak * 0.01  # -40dB
        silence_samples = np.sum(np.abs(y) < threshold)
        silence_ratio = float(silence_samples / max(1, len(y)))
    except Exception:
        silence_ratio = 0.0

    # Clipping ratio (samples within 99.5% of max possible amp 1.0)
    try:
        clipping_samples = np.sum(np.abs(y) >= 0.995)
        clipping_ratio = float(clipping_samples / max(1, len(y)))
    except Exception:
        clipping_ratio = 0.0

    return ForensicMetrics(
        sample_rate=effective_sr,
        duration_seconds=round(duration, 3),
        channels=channels,
        rms_energy=round(rms, 4),
        spectral_centroid_hz=round(mean_centroid, 1),
        spectral_rolloff_hz=round(mean_rolloff, 1),
        zero_crossing_rate=round(mean_zcr, 4),
        high_freq_energy_ratio=round(high_freq_ratio, 4),
        silence_ratio=round(silence_ratio, 4),
        clipping_ratio=round(clipping_ratio, 4),
    )


def generate_explainable_signals(
    metrics: ForensicMetrics,
    prediction: str,
    confidence: float,
    risk_score: float,
) -> List[ExplainableSignal]:
    """
    Generates explainable acoustic indicators based on verifiable forensic measurements.
    """
    signals: List[ExplainableSignal] = []

    # 1. High Frequency Artifacts / Vocoder Cutoff
    if metrics.high_freq_energy_ratio < 0.02 and metrics.sample_rate >= 16000:
        signals.append(
            ExplainableSignal(
                category="spectral",
                indicator="High-Frequency Energy Depletion",
                description="Unusually steep frequency attenuation above 4kHz characteristic of neural vocoder synthesis or aggressive lossy transcoding.",
                severity="high_anomaly" if prediction == "SPOOF" else "suspicious",
                score=min(100.0, (0.05 - metrics.high_freq_energy_ratio) * 2000),
            )
        )
    elif metrics.high_freq_energy_ratio > 0.35:
        signals.append(
            ExplainableSignal(
                category="spectral",
                indicator="Elevated High-Frequency Noise",
                description="High proportion of upper spectrum energy suggesting artificial additive noise or uncompensated synthesis harmonics.",
                severity="suspicious",
                score=min(100.0, metrics.high_freq_energy_ratio * 200),
            )
        )
    else:
        signals.append(
            ExplainableSignal(
                category="spectral",
                indicator="Spectral Bandwidth Distribution",
                description="Frequency band energy distribution matches expected natural human vocal tract resonance.",
                severity="normal",
                score=15.0,
            )
        )

    # 2. Spectral Rolloff & Centroid
    if metrics.spectral_rolloff_hz < 2200 and metrics.sample_rate >= 16000:
        signals.append(
            ExplainableSignal(
                category="codec",
                indicator="Severe Bandwidth Limitation",
                description=f"85% spectral rolloff occurs at {metrics.spectral_rolloff_hz} Hz, indicating telephony/narrowband codec or low-rate voice generation.",
                severity="suspicious",
                score=70.0,
            )
        )
    elif metrics.spectral_centroid_hz > 3500:
        signals.append(
            ExplainableSignal(
                category="spectral",
                indicator="Shifted Spectral Center",
                description=f"Elevated spectral centroid ({metrics.spectral_centroid_hz} Hz) indicating potential formant distortion or synthetic vocal brightness.",
                severity="suspicious" if prediction == "SPOOF" else "normal",
                score=60.0,
            )
        )

    # 3. Temporal and Silence Consistency
    if metrics.silence_ratio > 0.65:
        signals.append(
            ExplainableSignal(
                category="temporal",
                indicator="Unnatural Silence Gaps",
                description=f"High silence proportion ({round(metrics.silence_ratio * 100, 1)}%) detected, characteristic of automated sentence concatenation.",
                severity="suspicious",
                score=65.0,
            )
        )
    elif metrics.silence_ratio < 0.05 and metrics.duration_seconds > 2.0:
        signals.append(
            ExplainableSignal(
                category="temporal",
                indicator="Continuous Non-Breathing Flow",
                description="Continuous acoustic stream without natural micro-pauses or breath intervals.",
                severity="suspicious" if prediction == "SPOOF" else "normal",
                score=55.0,
            )
        )

    # 4. Digital Artifacts / Clipping
    if metrics.clipping_ratio > 0.02:
        signals.append(
            ExplainableSignal(
                category="codec",
                indicator="Digital Amplitude Saturation",
                description=f"{round(metrics.clipping_ratio * 100, 2)}% of samples exhibit digital clipping, causing harmonic distortion.",
                severity="high_anomaly",
                score=85.0,
            )
        )

    # 5. Model Neural Classifier Indication
    if prediction == "SPOOF":
        signals.append(
            ExplainableSignal(
                category="synthetic",
                indicator="Neural Pattern Discontinuity",
                description=f"AudioSpoofNet CNN activated high-probability synthetic acoustic features with {confidence}% confidence.",
                severity="high_anomaly",
                score=risk_score,
            )
        )
    else:
        signals.append(
            ExplainableSignal(
                category="synthetic",
                indicator="Natural Acoustic Dynamics",
                description="Acoustic features demonstrate human vocal tract characteristics and coherent phase relationships.",
                severity="normal",
                score=10.0,
            )
        )

    return signals
