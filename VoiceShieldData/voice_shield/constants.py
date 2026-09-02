"""
VoiceShield Central Constants & Semantic Label Definitions (Phase 3)
Guarantees consistent label interpretation across:
- Dataset loaders & manifests
- Model training & loss functions
- Checkpoint inference
- FastAPI ML microservice
- Node.js Express backend
- React frontend
"""

# Binary numerical targets for BCE / Model forward logits
LABEL_BONAFIDE: float = 1.0
LABEL_SPOOF: float = 0.0

# String classification identifiers
CLASS_BONAFIDE: str = "BONA_FIDE"
CLASS_SPOOF: str = "SPOOF"
CLASS_UNCERTAIN: str = "UNCERTAIN"
CLASS_INSUFFICIENT: str = "INSUFFICIENT_AUDIO"
CLASS_ERROR: str = "ANALYSIS_ERROR"

# Risk tier classifications
RISK_TIER_LOW: str = "LOW"             # Risk Score 0 - 25: Authentic Human Speech
RISK_TIER_MODERATE: str = "MODERATE"   # Risk Score 26 - 50: Inconclusive / Likely Human
RISK_TIER_HIGH: str = "HIGH"           # Risk Score 51 - 75: Likely Synthetic / Cloned
RISK_TIER_CRITICAL: str = "CRITICAL"   # Risk Score 76 - 100: Confirmed Synthetic / Deepfake

# Audio specifications
TARGET_SR: int = 16000
MIN_SPEECH_DURATION_SEC: float = 0.5
DEFAULT_WINDOW_SEC: float = 3.0
DEFAULT_HOP_SEC: float = 1.5
