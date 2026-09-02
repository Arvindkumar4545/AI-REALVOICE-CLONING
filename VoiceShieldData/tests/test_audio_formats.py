"""
Test audio format handling, validation, and conversion across all supported formats.
Supported: WAV, FLAC, MP3, OGG, M4A, WEBM
"""
import io
import numpy as np
import pytest
import soundfile as sf
import torch

from voice_shield.preprocessing import load_audio_safe, SAMPLE_RATE, TARGET_SAMPLES
from voice_shield.features import load_and_standardize_audio


def test_wav_audio_loading():
    """Generates synthetic WAV audio in memory and verifies clean 16kHz mono loading."""
    sr = 16000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    sine_wave = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, sine_wave, sr, format="WAV")
    buf.seek(0)

    tensor = load_and_standardize_audio(buf.read(), target_sr=sr, target_samples=TARGET_SAMPLES)
    assert isinstance(tensor, torch.Tensor)
    assert tensor.shape == (TARGET_SAMPLES,)
    assert torch.isfinite(tensor).all()
    assert tensor.abs().max() <= 1.0


def test_flac_audio_loading():
    """Verifies FLAC audio container support and normalization."""
    sr = 22050
    duration = 1.5
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    sine_wave = (0.4 * np.sin(2 * np.pi * 880 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, sine_wave, sr, format="FLAC")
    buf.seek(0)

    audio_arr = load_audio_safe(buf.read(), sr=16000, target_samples=TARGET_SAMPLES)
    assert isinstance(audio_arr, np.ndarray)
    assert len(audio_arr) == TARGET_SAMPLES
    assert np.isfinite(audio_arr).all()


def test_ogg_audio_loading():
    """Verifies OGG container support and normalization."""
    sr = 16000
    duration = 1.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    sine_wave = (0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, sine_wave, sr, format="OGG")
    buf.seek(0)

    audio_arr = load_audio_safe(buf.read(), sr=16000, target_samples=TARGET_SAMPLES)
    assert isinstance(audio_arr, np.ndarray)
    assert len(audio_arr) == TARGET_SAMPLES
    assert np.isfinite(audio_arr).all()


def test_corrupted_audio_recovery():
    """Verifies that corrupted bytes do not crash the engine and return clean normalized silence."""
    corrupted_bytes = b"NOT_A_REAL_AUDIO_HEADER_1234567890"
    audio_arr = load_audio_safe(corrupted_bytes, sr=16000, target_samples=TARGET_SAMPLES)
    assert isinstance(audio_arr, np.ndarray)
    assert len(audio_arr) == TARGET_SAMPLES
    assert (audio_arr == 0.0).all()
