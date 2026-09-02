"""VoiceShield Multi-Model Anti-Spoofing & Deepfake Detection Architectures."""

from .lcnn import LCNN
from .rawnet2 import RawNet2
from .aasist import AASIST
from .wavlm_head import WavLMClassifier
from .bilstm_prosody import BiLSTMProsodyModel
from .ecapa import ECAPATDNN, compute_speaker_consistency_score
from .fusion import VoiceShieldRiskClassifier
from .calibration import ModelCalibrator
from .losses import FocalLoss, get_loss_function

__all__ = [
    "LCNN",
    "RawNet2",
    "AASIST",
    "WavLMClassifier",
    "BiLSTMProsodyModel",
    "ECAPATDNN",
    "compute_speaker_consistency_score",
    "VoiceShieldRiskClassifier",
    "ModelCalibrator",
    "FocalLoss",
    "get_loss_function",
]
