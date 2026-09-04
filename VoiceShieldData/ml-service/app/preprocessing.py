"""
Audio Preprocessing and Feature Extraction for VoiceShield
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple, Optional, Dict, Any

import librosa
import numpy as np
import soundfile as sf
import torch

ALLOWED_EXTENSIONS = {".wav", ".flac", ".mp3", ".ogg", ".m4a", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
TARGET_SR = 16000
TARGET_DURATION_SEC = 4
TARGET_SAMPLES = TARGET_SR * TARGET_DURATION_SEC
N_MELS = 40
N_FRAMES = 96


def detect_audio_format_from_header(file_bytes: bytes) -> Optional[str]:
    """
    Detects audio format from file magic bytes header.
    """
    if len(file_bytes) < 4:
        return None
    
    header = file_bytes[:4]
    magic_bytes = {
        b'RIFF': 'wav',
        b'ID3': 'mp3',
        b'\xff\xfb': 'mp3',
        b'\xff\xfa': 'mp3',
        b'fLaC': 'flac',
        b'\x1a\x45\xdf\xa3': 'webm',
        b'ftypisom': 'mp4',
        b'ftypisomiso2mp41': 'mp4',
    }
    
    for magic, fmt in magic_bytes.items():
        if header.startswith(magic):
            return fmt
    
    # Check for OGG container
    if len(file_bytes) >= 4 and file_bytes[:4] == b'OggS':
        return 'ogg'
    
    # Check for M4A (MP4 variant)
    if len(file_bytes) >= 8 and file_bytes[4:8] == b'ftyp':
        return 'm4a'
    
    return None


def validate_audio_file(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Validates audio file format, size, and header integrity.
    """
    ext = Path(filename).suffix.lower().lstrip(".")
    
    if len(file_bytes) == 0:
        return {
            "valid": False,
            "error": "Audio file is empty (0 bytes)",
            "file_size": 0,
            "format": None,
        }

    if len(file_bytes) > MAX_FILE_SIZE:
        return {
            "valid": False,
            "error": f"File size ({len(file_bytes)} bytes) exceeds maximum limit ({MAX_FILE_SIZE} bytes)",
            "file_size": len(file_bytes),
            "format": ext,
        }

    # Detect format from header if filename has no extension
    detected_format = detect_audio_format_from_header(file_bytes)
    use_format = detected_format or (ext if ext in ALLOWED_EXTENSIONS else None)
    
    if ext and ext not in ALLOWED_EXTENSIONS and not detected_format:
        return {
            "valid": False,
            "error": f"Unsupported extension: .{ext}. Allowed formats: {sorted(list(ALLOWED_EXTENSIONS))}",
            "file_size": len(file_bytes),
            "format": None,
        }

    if not use_format:
        return {
            "valid": False,
            "error": f"Could not determine audio format from file header or extension. Allowed formats: {sorted(list(ALLOWED_EXTENSIONS))}",
            "file_size": len(file_bytes),
            "format": None,
        }

    # 1. Try soundfile with detected format hint
    try:
        with io.BytesIO(file_bytes) as bio:
            info = sf.info(bio, format=use_format)
            return {
                "valid": True,
                "file_size": len(file_bytes),
                "format": use_format,
                "sample_rate": info.samplerate,
                "channels": info.channels,
                "duration_seconds": round(info.duration, 3),
                "error": None,
            }
    except Exception:
        pass

    # 2. Try librosa with explicit loader
    try:
        with io.BytesIO(file_bytes) as bio:
            y, sr = librosa.load(bio, sr=None, mono=False)
            channels = 1 if y.ndim == 1 else y.shape[0]
            duration = len(y) / sr if y.ndim == 1 else y.shape[1] / sr
            return {
                "valid": True,
                "file_size": len(file_bytes),
                "format": use_format,
                "sample_rate": int(sr),
                "channels": int(channels),
                "duration_seconds": round(float(duration), 3),
                "error": None,
            }
    except Exception:
        pass

    # 3. Try PyAV container parsing (for WebM, Opus, MP4, AAC)
    try:
        import av
        bio = io.BytesIO(file_bytes)
        bio.seek(0)  # Ensure we're at the start
        container = av.open(bio)
        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if audio_stream:
            duration = float(audio_stream.duration * audio_stream.time_base) if audio_stream.duration else 0.0
            sr = audio_stream.rate or TARGET_SR
            channels = audio_stream.channels or 1
            container.close()
            return {
                "valid": True,
                "file_size": len(file_bytes),
                "format": use_format,
                "sample_rate": int(sr),
                "channels": int(channels),
                "duration_seconds": round(float(duration), 3),
                "error": None,
            }
        container.close()
    except Exception:
        pass

    return {
        "valid": False,
        "error": f"Could not decode audio file. Format detected: {use_format}. Supported formats: WAV, FLAC, MP3, OGG, M4A, WebM",
        "file_size": len(file_bytes),
        "format": use_format,
    }


def load_audio_array(audio_source: str | Path | bytes, sr: int = TARGET_SR) -> Tuple[np.ndarray, int]:
    """
    Loads audio into 1D float32 numpy array resampled to `sr` Hz mono.
    Handles BytesIO with format detection from audio headers.
    Uses PyAV for WebM and other container formats.
    """
    detected_fmt = None
    
    # Detect format from header if bytes
    if isinstance(audio_source, bytes):
        detected_fmt = detect_audio_format_from_header(audio_source)
    
    # 1. Use PyAV first for WebM, MP4, and other container formats
    if detected_fmt in ("webm", "m4a", "mp4", "ogg"):
        try:
            import av
            if isinstance(audio_source, bytes):
                bio = io.BytesIO(audio_source)
                bio.seek(0)  # Ensure we're at the start
                container = av.open(bio)
            else:
                container = av.open(str(audio_source))

            audio_stream = next((s for s in container.streams if s.type == "audio"), None)
            if audio_stream:
                resampler = av.AudioResampler(format="fltp", layout="mono", rate=sr)
                chunks = []
                for frame in container.decode(audio_stream):
                    for resampled_frame in resampler.resample(frame):
                        chunks.append(resampled_frame.to_ndarray())
                container.close()
                if chunks:
                    arr = np.concatenate(chunks, axis=1).squeeze(0).astype(np.float32)
                    return arr, sr
            container.close()
        except Exception as av_error:
            pass
    
    # 2. Try librosa for WAV, FLAC, MP3, and other formats
    try:
        if isinstance(audio_source, (str, Path)):
            y, orig_sr = librosa.load(str(audio_source), sr=sr, mono=True)
        elif isinstance(audio_source, bytes):
            bio = io.BytesIO(audio_source)
            bio.seek(0)  # Ensure we're at the start
            y, orig_sr = librosa.load(bio, sr=sr, mono=True)
        else:
            raise ValueError(f"Unsupported audio source type: {type(audio_source)}")

        if not isinstance(y, np.ndarray):
            y = np.asarray(y, dtype=np.float32)
        return y.astype(np.float32), sr
    except Exception as librosa_error:
        pass
    
    # 3. Final fallback to PyAV for any remaining formats
    try:
        import av
        if isinstance(audio_source, bytes):
            bio = io.BytesIO(audio_source)
            bio.seek(0)  # Ensure we're at the start
            container = av.open(bio)
        else:
            container = av.open(str(audio_source))

        audio_stream = next((s for s in container.streams if s.type == "audio"), None)
        if audio_stream:
            resampler = av.AudioResampler(format="fltp", layout="mono", rate=sr)
            chunks = []
            for frame in container.decode(audio_stream):
                for resampled_frame in resampler.resample(frame):
                    chunks.append(resampled_frame.to_ndarray())
            container.close()
            if chunks:
                arr = np.concatenate(chunks, axis=1).squeeze(0).astype(np.float32)
                return arr, sr
        container.close()
    except Exception:
        pass
    
    # If all methods fail, raise a clear error
    raise ValueError(f"Failed to load audio file. Format detected: {detected_fmt or 'unknown'}. Supported formats: WAV, FLAC, MP3, OGG, M4A, WebM")


def extract_mel_spectrogram_tensor(y: np.ndarray, sr: int = TARGET_SR) -> torch.Tensor:
    """
    Extracts standard log-Mel spectrogram matching the AudioSpoofNet architecture.
    Output: torch.Tensor of shape (1, 40, 96)
    """
    # Pad or truncate audio to exactly 4 seconds (64,000 samples at 16kHz)
    if len(y) < TARGET_SAMPLES:
        y = np.pad(y, (0, TARGET_SAMPLES - len(y)), mode="constant")
    else:
        y = y[:TARGET_SAMPLES]

    # Compute Mel spectrogram
    mel = librosa.feature.melspectrogram(
        y=y,
        sr=sr,
        n_mels=N_MELS,
        n_fft=512,
        hop_length=160,
        win_length=400,
        fmin=20,
        fmax=8000,
    )

    # Convert to log-mel (dB)
    log_mel = librosa.power_to_db(mel, ref=np.max)

    # Standardize
    mean_val = np.mean(log_mel)
    std_val = np.std(log_mel) + 1e-6
    log_mel = (log_mel - mean_val) / std_val

    # Convert to Tensor (1, 40, T)
    feature = torch.from_numpy(log_mel.astype(np.float32)).unsqueeze(0)

    # Ensure temporal frame length is exactly 96
    if feature.shape[-1] < N_FRAMES:
        pad_amount = N_FRAMES - feature.shape[-1]
        feature = torch.nn.functional.pad(feature, (0, pad_amount))
    else:
        feature = feature[..., :N_FRAMES]

    return feature
