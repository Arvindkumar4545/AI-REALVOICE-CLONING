"""
Unit tests for VoiceShield Model Fusion, Disagreement Analysis, and Uncertainty Estimation.
"""
import pytest
from voice_shield.models.fusion import VoiceShieldRiskClassifier
from voice_shield.constants import CLASS_BONAFIDE, CLASS_UNCERTAIN, CLASS_SPOOF


def test_model_disagreement_forces_uncertain():
    """
    CRITICAL TEST: When one model (e.g. LCNN) claims 0.90 but other models (WavLM, BiLSTM)
    disagree with 0.35 and 0.28, the system MUST yield UNCERTAIN and NOT accuse human speech of being SPOOF.
    """
    classifier = VoiceShieldRiskClassifier()
    # High LCNN false-positive spike on noisy human speech, but other models disagree
    scores = {"lcnn": 0.88, "wavlm": 0.32, "bilstm": 0.28, "rawnet2": 0.30, "aasist": 0.30}
    result = classifier.compute_risk(scores)
    
    assert result["is_disagreement"] is True, "Must detect divergence across primary sub-models"
    assert result["classification"] == CLASS_UNCERTAIN, "Disagreement must result in UNCERTAIN, never SPOOF"
    assert result["prediction"] == "uncertain"
    assert result["uncertainty"] > 0.30, "Uncertainty must be elevated when models diverge"
    assert result["risk_score"] <= 60.0, "Risk score must be capped under disagreement"


def test_confidence_separation_from_probability():
    """Verifies that confidence measures decision certitude rather than raw probability value."""
    classifier = VoiceShieldRiskClassifier()
    
    # 1. Unanimous confident spoof
    confident_spoof = classifier.compute_risk({"lcnn": 0.92, "wavlm": 0.90, "bilstm": 0.94})
    # 2. Split decision with moderate probability
    uncertain_split = classifier.compute_risk({"lcnn": 0.85, "wavlm": 0.40, "bilstm": 0.35})
    
    assert confident_spoof["confidence"] > uncertain_split["confidence"]
    assert uncertain_split["uncertainty"] > confident_spoof["uncertainty"]


def test_wavlm_spike_without_consensus_stays_uncertain():
    """WavLM should not trigger a hard spoof verdict when the rest of the ensemble is not aligned."""
    classifier = VoiceShieldRiskClassifier()
    scores = {"lcnn": 0.60, "wavlm": 0.80, "bilstm": 0.58, "rawnet2": 0.40, "aasist": 0.42}

    result = classifier.compute_risk(scores)

    assert result["classification"] == CLASS_UNCERTAIN
    assert result["prediction"] == "uncertain"
    assert result["risk_score"] <= 65.0
