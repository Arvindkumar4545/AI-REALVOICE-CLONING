"""
Unit tests for Structured API Error Handling and HTTP 400 Tracing.
"""
import io
import pytest
from fastapi.testclient import TestClient

from app.main import app as ml_app


@pytest.fixture
def client():
    with TestClient(ml_app) as c:
        yield c


def test_empty_audio_upload_returns_structured_error(client):
    """Verifies that 0-byte upload returns clear structured error with HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("empty.wav", io.BytesIO(b""), "audio/wav")},
    )
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data or "error" in data


def test_unsupported_audio_format_returns_clear_message(client):
    """Verifies that completely non-audio files (e.g. .exe) return clear HTTP 400."""
    response = client.post(
        "/predict",
        files={"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00"), "application/octet-stream")},
    )
    assert response.status_code == 400
