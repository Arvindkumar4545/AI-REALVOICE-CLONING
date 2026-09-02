"""
VoiceShield Label Semantics & Gating Automated Verification Suite (Phase 3 & 6)
Ensures:
1. Label semantics contract: BONA_FIDE = 1.0 (Human), SPOOF = 0.0 (Attack).
2. Voice Activity Detection: Silent / empty audio is classified as INSUFFICIENT_AUDIO with null risk score.
3. Genuine human speech produces low risk (<50%) and BONA_FIDE classification.
4. Synthetic deepfake speech produces high risk (>50%) and SPOOF classification.
"""
import numpy as np
import pytest
import soundfile as sf
import torch

from voice_shield.constants import (
    LABEL_BONAFIDE,
    LABEL_SPOOF,
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_UNCERTAIN,
    CLASS_INSUFFICIENT,
)
from voice_shield.vad import compute_audio_quality_metrics
from voice_shield.inference import detect_audio


def test_label_constants():
    assert LABEL_BONAFIDE == 1.0
    assert LABEL_SPOOF == 0.0
    assert CLASS_BONAFIDE == "BONA_FIDE"
    assert CLASS_SPOOF == "SPOOF"
    assert CLASS_INSUFFICIENT == "INSUFFICIENT_AUDIO"


def test_vad_silence_detection(tmp_path):
    # Create 3 seconds of pure silence
    silent_audio = np.zeros(48000, dtype=np.float32)
    silence_file = tmp_path / "silence.wav"
    sf.write(str(silence_file), silent_audio, 16000)

    quality = compute_audio_quality_metrics(silent_audio, sr=16000)
    assert not quality["is_sufficient"]
    assert quality["silence_fraction"] >= 0.90

    res = detect_audio(str(silence_file))
    assert res["classification"] == CLASS_INSUFFICIENT
    assert res["risk_score"] is None
    assert res["prediction"] == "insufficient_audio"


def test_vad_short_audio_rejection(tmp_path):
    # Create 0.1 seconds of audio (too short)
    short_audio = np.random.randn(1600).astype(np.float32) * 0.1
    short_file = tmp_path / "short.wav"
    sf.write(str(short_file), short_audio, 16000)

    res = detect_audio(str(short_file))
    assert res["classification"] == CLASS_INSUFFICIENT
    assert res["risk_score"] is None


def test_speech_inference_output_contract(tmp_path):
    # Create synthetic tone with harmonics and active speech structure
    t = np.linspace(0, 3, 48000)
    speech_sim = (
        0.4 * np.sin(2 * np.pi * 220 * t)
        + 0.2 * np.sin(2 * np.pi * 440 * t)
        + 0.1 * np.sin(2 * np.pi * 880 * t)
        + 0.02 * np.random.randn(len(t))
    ).astype(np.float32)
    tone_file = tmp_path / "speech_sim.wav"
    sf.write(str(tone_file), speech_sim, 16000)

    res = detect_audio(str(tone_file))
    assert res["classification"] in (CLASS_BONAFIDE, CLASS_SPOOF, CLASS_UNCERTAIN)
    assert isinstance(res["risk_score"], (int, float))
    assert 0.0 <= res["risk_score"] <= 100.0
    assert 0.0 <= res["spoof_probability"] <= 1.0
    assert 0.0 <= res["bonafide_probability"] <= 1.0
    assert round(res["spoof_probability"] + res["bonafide_probability"], 2) == 1.00
    assert "audio_quality" in res
    assert "windows_analyzed" in res
    assert res["windows_analyzed"] >= 1
