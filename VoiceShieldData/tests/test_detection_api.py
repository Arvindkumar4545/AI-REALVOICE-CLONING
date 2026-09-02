import io
import sys
from pathlib import Path
import pytest
import soundfile as sf
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
ml_service_path = str(ROOT_DIR / "ml-service")
if ml_service_path not in sys.path:
    sys.path.insert(0, ml_service_path)

from app.preprocessing import validate_audio_file, MAX_FILE_SIZE, ALLOWED_EXTENSIONS


def test_validate_audio_file_valid_wav():
    """Verifies that valid WAV audio passes validation with correct duration and sample rate."""
    sr = 16000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    data = 0.5 * np.sin(2 * np.pi * 440 * t)

    buf = io.BytesIO()
    sf.write(buf, data, sr, format="WAV")
    wav_bytes = buf.getvalue()

    res = validate_audio_file(wav_bytes, "sample.wav")
    assert res["valid"] is True
    assert res["error"] is None
    assert res["sample_rate"] == 16000
    assert res["duration_seconds"] == pytest.approx(2.0, 0.1)


def test_validate_audio_file_empty_bytes():
    """Verifies that empty 0-byte upload is caught and rejected."""
    res = validate_audio_file(b"", "empty.wav")
    assert res["valid"] is False
    assert "empty" in res["error"].lower()


def test_validate_audio_file_unsupported_extension():
    """Verifies that unsupported file extensions (.exe, .txt, etc.) are rejected."""
    res = validate_audio_file(b"some data", "malicious.exe")
    assert res["valid"] is False
    assert "unsupported" in res["error"].lower()


def test_validate_audio_file_supported_extensions():
    """Verifies that all 6 supported extensions are accepted by policy."""
    for ext in [".wav", ".flac", ".mp3", ".ogg", ".m4a", ".webm"]:
        assert ext in ALLOWED_EXTENSIONS
