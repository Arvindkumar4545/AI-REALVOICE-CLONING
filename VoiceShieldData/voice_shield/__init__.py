"""VoiceShield production anti-spoofing pipeline."""

from .dataset import build_dataset_manifest, parse_asvspoof_protocol
from .inference import load_model, predict_audio, VoiceShieldInferenceEngine
from .model import AudioSpoofNet, AudioSpoofNetV2
from .advanced_features import extract_advanced_features
from .augmentations import augment_audio
from .hybrid_model import SpectroTemporalAntiSpoofNet

__all__ = [
    "AudioSpoofNet",
    "AudioSpoofNetV2",
    "SpectroTemporalAntiSpoofNet",
    "VoiceShieldInferenceEngine",
    "build_dataset_manifest",
    "parse_asvspoof_protocol",
    "extract_advanced_features",
    "augment_audio",
    "load_model",
    "predict_audio",
]
