"""
Unit tests for VAD, Short Audio Gating (<0.5s, 0.5-2.0s, 2-4s), and Silence Handling.
"""
import numpy as np
import pytest
import torch

from voice_shield.vad import compute_audio_quality_metrics
from voice_shield.models.fusion import VoiceShieldRiskClassifier
from voice_shield.constants import CLASS_INSUFFICIENT


def test_sub_half_second_audio_rejected():
    """Verifies that audio shorter than 0.5s is safely rejected as INSUFFICIENT."""
    sr = 16000
    short_audio = np.random.randn(int(sr * 0.35)) * 0.5  # 350ms
    metrics = compute_audio_quality_metrics(short_audio, sr=sr)
    
    assert metrics["is_sufficient"] is False
    assert metrics["duration_tier"] == "INSUFFICIENT"
    
    classifier = VoiceShieldRiskClassifier()
    res = classifier.compute_risk({"lcnn": 0.5}, audio_quality=metrics)
    assert res["classification"] == CLASS_INSUFFICIENT
    assert res["prediction"] == "insufficient_audio"
    assert res["risk_score"] is None


def test_pure_silence_rejected():
    """Verifies that pure background silence is rejected as INSUFFICIENT."""
    sr = 16000
    silence = np.zeros(int(sr * 3.0))  # 3 seconds of zero energy
    metrics = compute_audio_quality_metrics(silence, sr=sr)
    
    assert metrics["is_sufficient"] is False
    assert metrics["speech_detected"] is False
    assert metrics["silence_fraction"] >= 0.95


def test_tiered_duration_classification():
    """Verifies that durations 0.5s-2s get LOW_INFORMATION and >4s get NORMAL."""
    sr = 16000
    t = np.linspace(0, 1.2, int(sr * 1.2))
    # 1.2s tone with harmonics (speech-like energy)
    tone_1_2s = np.sin(2 * np.pi * 220 * t) * 0.3 + np.sin(2 * np.pi * 440 * t) * 0.2
    metrics_short = compute_audio_quality_metrics(tone_1_2s, sr=sr)
    assert metrics_short["duration_tier"] == "LOW_INFORMATION"
    assert metrics_short["is_sufficient"] is True
    
    t_5s = np.linspace(0, 5.0, int(sr * 5.0))
    tone_5s = np.sin(2 * np.pi * 220 * t_5s) * 0.3
    metrics_normal = compute_audio_quality_metrics(tone_5s, sr=sr)
    assert metrics_normal["duration_tier"] == "NORMAL"
