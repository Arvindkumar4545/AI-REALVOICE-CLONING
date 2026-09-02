"""Channel and acoustic augmentations for robust deepfake detection training."""
from __future__ import annotations

import random
import shutil
import subprocess
import tempfile
from pathlib import Path

import librosa
import numpy as np
from scipy.signal import butter, sosfilt

from .preprocessing import SAMPLE_RATE, TARGET_SAMPLES, load_audio_safe


def _match_length(audio: np.ndarray, size: int) -> np.ndarray:
    if len(audio) < size:
        return np.pad(audio, (0, size - len(audio)))
    return audio[:size]


def _band_limit(audio: np.ndarray, sr: int, high_hz: float) -> np.ndarray:
    sos = butter(6, [300.0, min(high_hz, sr / 2 - 100)], btype="bandpass", fs=sr, output="sos")
    return sosfilt(sos, audio).astype(np.float32)


def _g711_ulaw(audio: np.ndarray) -> np.ndarray:
    magnitude = np.log1p(255.0 * np.abs(audio)) / np.log1p(255.0)
    return (np.sign(audio) * magnitude).astype(np.float32)


def _ffmpeg_codec(audio: np.ndarray, sr: int, codec: str) -> np.ndarray | None:
    executable = shutil.which("ffmpeg")
    if executable is None:
        return None
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / "source.wav"
        target = Path(directory) / "encoded.wav"
        import soundfile as sf
        sf.write(source, audio, sr, subtype="PCM_16")
        if codec == "mp3":
            command = [executable, "-y", "-loglevel", "error", "-i", str(source), "-codec:a", "libmp3lame", "-b:a", "24k", str(target)]
        elif codec == "amr-nb":
            command = [executable, "-y", "-loglevel", "error", "-i", str(source), "-ar", "8000", "-ac", "1", "-codec:a", "libopencore_amrnb", "-b:a", "4.75k", str(target)]
        else:
            command = [executable, "-y", "-loglevel", "error", "-i", str(source), "-ar", "8000", "-ac", "1", "-codec:a", "pcm_mulaw", str(target)]
        try:
            subprocess.run(command, check=True, capture_output=True)
            return load_audio_safe(target, sr=sr, target_samples=len(audio))
        except (OSError, subprocess.CalledProcessError):
            return None


def codec_effect(audio: np.ndarray, sr: int, codec: str) -> np.ndarray:
    """Apply G.711, AMR-NB, or low-bitrate MP3 compression."""
    encoded = _ffmpeg_codec(audio, sr, codec)
    if encoded is not None:
        return _match_length(encoded, len(audio))
    if codec == "g711":
        return _g711_ulaw(_band_limit(audio, sr, 3800.0))
    if codec == "amr-nb":
        return np.round(_band_limit(audio, sr, 3400.0) * 64.0) / 64.0
    limited = librosa.resample(_band_limit(audio, sr, 7000.0), orig_sr=sr, target_sr=8000)
    restored = librosa.resample(limited, orig_sr=8000, target_sr=sr)
    return np.round(_match_length(restored, len(audio)) * 128.0) / 128.0


def _noise_like(noise: np.ndarray, size: int) -> np.ndarray:
    if len(noise) == 0:
        return np.zeros(size, dtype=np.float32)
    start = random.randint(0, max(0, len(noise) - min(size, len(noise))))
    return _match_length(np.roll(noise, -start), size)


def add_noise(audio: np.ndarray, noise: np.ndarray, snr_db: float) -> np.ndarray:
    """Mix noise at a controlled signal-to-noise ratio."""
    noise = _noise_like(noise, len(audio))
    signal_rms = np.sqrt(np.mean(audio ** 2) + 1e-8)
    noise_rms = np.sqrt(np.mean(noise ** 2) + 1e-8)
    scaled_noise = noise * (signal_rms / (10.0 ** (snr_db / 20.0) * noise_rms))
    return np.clip(audio + scaled_noise, -1.0, 1.0).astype(np.float32)


def babble_noise(speech_samples: list[np.ndarray], size: int) -> np.ndarray:
    """Create babble from randomly selected speech recordings."""
    selected = [_noise_like(sample, size) for sample in random.sample(speech_samples, min(4, len(speech_samples)))]
    return np.mean(selected, axis=0).astype(np.float32) if selected else np.zeros(size, dtype=np.float32)


def augment_audio(audio: np.ndarray | str | Path, sr: int = SAMPLE_RATE, noise_samples: list[np.ndarray] | None = None, p: float = 0.8) -> np.ndarray:
    """Apply codec, noise, speed, and pitch perturbations to one recording."""
    clean = load_audio_safe(audio, sr=sr, target_samples=TARGET_SAMPLES) if isinstance(audio, (str, Path)) else _match_length(np.asarray(audio, dtype=np.float32), TARGET_SAMPLES)
    augmented = clean.copy()
    if random.random() < p:
        augmented = codec_effect(augmented, sr, random.choice(["g711", "amr-nb", "mp3"]))
    if random.random() < p:
        if noise_samples:
            noise = babble_noise(noise_samples, len(augmented)) if random.random() < 0.5 else _noise_like(random.choice(noise_samples), len(augmented))
        else:
            noise = np.random.normal(0.0, 1.0, len(augmented)).astype(np.float32)
        augmented = add_noise(augmented, noise, random.uniform(5.0, 20.0))
    if random.random() < p:
        augmented = _match_length(librosa.effects.time_stretch(augmented, rate=random.uniform(0.9, 1.1)), TARGET_SAMPLES)
    if random.random() < p:
        augmented = librosa.effects.pitch_shift(augmented, sr=sr, n_steps=random.uniform(-2.0, 2.0))
    return np.clip(_match_length(augmented, TARGET_SAMPLES), -1.0, 1.0).astype(np.float32)


__all__ = ["augment_audio", "codec_effect", "add_noise", "babble_noise"]
