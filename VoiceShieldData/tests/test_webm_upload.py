"""
Unit tests for WebM / Opus container audio decoding and microphone stream uploads.
"""
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app as ml_app
from voice_shield.preprocessing import load_audio_safe
import numpy as np
import soundfile as sf
import torch


@pytest.fixture
def client():
    with TestClient(ml_app) as c:
        yield c


def test_decode_with_pyav_fallback_on_raw_wav():
    """Verifies that PyAV / Soundfile decode standard WAV seamlessly."""
    sr = 16000
    t = np.linspace(0, 1.0, sr)
    samples = np.sin(2 * np.pi * 440 * t).astype(np.float32)
    
    buf = io.BytesIO()
    sf.write(buf, samples, sr, format="WAV")
    wav_bytes = buf.getvalue()
    
    audio_tensor = load_audio_safe(wav_bytes, sr=sr)
    assert isinstance(audio_tensor, (np.ndarray, torch.Tensor))
    assert len(audio_tensor) > 0
    assert np.all(np.isfinite(np.asarray(audio_tensor)))


def test_microphone_webm_endpoint_upload(client):
    """Verifies that the /predict endpoint accepts audio/webm and decodes without 400 errors."""
    sr = 16000
    t = np.linspace(0, 1.5, int(sr * 1.5))
    samples = (np.sin(2 * np.pi * 300 * t) * 0.4).astype(np.float32)
    
    buf = io.BytesIO()
    sf.write(buf, samples, sr, format="WAV")
    audio_bytes = buf.getvalue()
    
    # Send with webm filename and audio/webm mime type
    response = client.post(
        "/predict",
        files={"file": ("recording.webm", io.BytesIO(audio_bytes), "audio/webm")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["prediction"] in ["BONA_FIDE", "UNCERTAIN", "SPOOF", "INSUFFICIENT_AUDIO"]
