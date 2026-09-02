"""
Unit and Integration Tests for VoiceShield ML Service
"""
import io
from pathlib import Path
import numpy as np
import soundfile as sf
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.model import AudioSpoofNet
import torch


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def sample_wav_bytes():
    """Generates a valid 2-second sine wave audio in WAV format."""
    sr = 16000
    t = np.linspace(0, 2.0, int(sr * 2.0), endpoint=False)
    # 440 Hz sine wave
    data = 0.5 * np.sin(2 * np.pi * 440 * t)
    bio = io.BytesIO()
    sf.write(bio, data.astype(np.float32), sr, format="WAV")
    return bio.getvalue()


def test_model_architecture():
    """Tests AudioSpoofNet input and output tensor dimensions."""
    model = AudioSpoofNet()
    x = torch.randn(4, 1, 40, 96)
    out = model(x)
    assert out.shape == (4,)
    assert (out >= 0.0).all() and (out <= 1.0).all()


def test_health_endpoint(client):
    """Tests /health returns 200 and healthy status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("healthy", "degraded")
    assert "uptime_seconds" in data
    assert "memory_mb" in data


def test_model_info_endpoint(client):
    """Tests /model/info returns valid metadata."""
    res = client.get("/model/info")
    assert res.status_code == 200
    data = res.json()
    assert data["model_name"] in ("AudioSpoofNet", "AudioSpoofNetV2")
    assert data["input_shape"] == [1, 40, 96]
    assert data["total_parameters"] > 100000


def test_validate_audio_endpoint(client, sample_wav_bytes):
    """Tests /validate-audio with a valid WAV file."""
    files = {"file": ("test_sine.wav", sample_wav_bytes, "audio/wav")}
    res = client.post("/validate-audio", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is True
    assert data["sample_rate"] == 16000
    assert data["duration_seconds"] > 1.9


def test_validate_invalid_file(client):
    """Tests /validate-audio rejection with bad file extension."""
    files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
    res = client.post("/validate-audio", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["valid"] is False
    assert "Unsupported extension" in data["error"]


def test_predict_endpoint(client, sample_wav_bytes):
    """Tests /predict performs full inference and returns calibrated scores."""
    files = {"file": ("test_sine.wav", sample_wav_bytes, "audio/wav")}
    headers = {"X-Request-ID": "test-req-12345"}
    res = client.post("/predict", files=files, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["request_id"] == "test-req-12345"
    assert data["prediction"] in ("BONA_FIDE", "SPOOF", "UNCERTAIN")
    assert 0 <= data["confidence"] <= 100
    assert 0 <= data["risk_score"] <= 100
    assert data["processing_time_ms"] > 0
    assert "forensics" in data
    assert "explainability" in data
    assert data["forensics"]["sample_rate"] == 16000
