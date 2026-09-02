"""
Unit tests for 3-State Calibrated Decision Boundaries & Risk Scores.
"""
import pytest
from voice_shield.models.fusion import VoiceShieldRiskClassifier
from voice_shield.constants import CLASS_BONAFIDE, CLASS_UNCERTAIN, CLASS_SPOOF, CLASS_INSUFFICIENT


def test_clear_bonafide_decision():
    """Verifies that uniformly low spoof probabilities produce BONA_FIDE classification."""
    classifier = VoiceShieldRiskClassifier()
    scores = {"lcnn": 0.12, "wavlm": 0.15, "bilstm": 0.18, "rawnet2": 0.10, "aasist": 0.12}
    result = classifier.compute_risk(scores)
    
    assert result["classification"] == CLASS_BONAFIDE
    assert result["prediction"] == "bonafide"
    assert result["risk_tier"] == "LOW"
    assert result["risk_score"] < 35.0
    assert result["is_disagreement"] is False


def test_clear_spoof_decision():
    """Verifies that uniformly high spoof probabilities produce SPOOF classification."""
    classifier = VoiceShieldRiskClassifier()
    scores = {"lcnn": 0.88, "wavlm": 0.85, "bilstm": 0.82, "rawnet2": 0.80, "aasist": 0.84}
    result = classifier.compute_risk(scores)
    
    assert result["classification"] == CLASS_SPOOF
    assert result["prediction"] == "spoof"
    assert result["risk_score"] > 65.0
    assert result["is_disagreement"] is False


def test_ambiguous_range_yields_uncertain():
    """Verifies that mid-range probabilities (around 0.50) yield UNCERTAIN rather than premature SPOOF."""
    classifier = VoiceShieldRiskClassifier()
    scores = {"lcnn": 0.52, "wavlm": 0.48, "bilstm": 0.50, "rawnet2": 0.49, "aasist": 0.51}
    result = classifier.compute_risk(scores)
    
    assert result["classification"] == CLASS_UNCERTAIN
    assert result["prediction"] == "uncertain"
    assert result["risk_tier"] == "MODERATE"
    assert 35.0 <= result["risk_score"] <= 65.0
