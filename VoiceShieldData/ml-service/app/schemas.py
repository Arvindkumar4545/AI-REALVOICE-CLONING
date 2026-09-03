"""
Pydantic Schemas for VoiceShield ML Service API
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ForensicMetrics(BaseModel):
    sample_rate: int = Field(..., description="Audio sample rate in Hz")
    duration_seconds: float = Field(..., description="Duration in seconds")
    channels: int = Field(..., description="Number of audio channels")
    rms_energy: float = Field(..., description="Root mean square energy level")
    spectral_centroid_hz: float = Field(..., description="Spectral centroid in Hz")
    spectral_rolloff_hz: float = Field(..., description="Spectral rolloff frequency in Hz")
    zero_crossing_rate: float = Field(..., description="Zero crossing rate")
    high_freq_energy_ratio: float = Field(..., description="High frequency energy ratio (above 4kHz)")
    silence_ratio: float = Field(..., description="Fraction of audio containing silence/near-silence")
    clipping_ratio: float = Field(..., description="Fraction of samples near clipping threshold")


class ExplainableSignal(BaseModel):
    category: str = Field(..., description="Signal category: spectral, temporal, codec, synthetic")
    indicator: str = Field(..., description="Specific signal indicator name")
    description: str = Field(..., description="Detailed explanation of the observation")
    severity: str = Field(..., description="Severity level: normal, suspicious, high_anomaly")
    score: float = Field(..., description="Normalized anomaly score 0-100")


class PredictResponse(BaseModel):
    success: bool = True
    request_id: str
    filename: str
    file_size_bytes: int
    prediction: str = Field(..., description="BONA_FIDE, UNCERTAIN, or SPOOF")
    classification: Optional[str] = Field(None, description="Detailed classification state")
    confidence: float = Field(..., description="Calibrated model confidence percentage 0-100")
    uncertainty: Optional[float] = Field(None, description="Estimated epistemic and model uncertainty 0.0-1.0")
    risk_score: Optional[float] = Field(..., description="Calibrated authenticity risk score 0-100 (100 = definitely spoof/scam)")
    fraud_risk: Optional[float] = Field(None, description="Independent fraud-risk score 0-100, separate from voice authenticity verdict")
    risk_tier: Optional[str] = Field(None, description="LOW, MODERATE, HIGH, CRITICAL, or INSUFFICIENT")
    spoof_probability: float = Field(..., description="Spoof probability percentage 0-100")
    bona_fide_probability: float = Field(..., description="Bona fide probability percentage 0-100")
    raw_probability: float = Field(..., description="Raw calibrated model output")
    processing_time_ms: float = Field(..., description="Inference latency in milliseconds")
    model_name: str
    model_version: str
    checkpoint_hash: str
    model_agreement: Optional[float] = Field(None, description="Agreement ratio across neural sub-models")
    decision_reason: Optional[str] = Field(None, description="Summary forensic decision rationale")
    windows_analyzed: Optional[int] = Field(1, description="Number of sliding audio windows analyzed")
    suspicious_windows: Optional[int] = Field(0, description="Number of suspicious audio windows")
    model_scores: Optional[Dict[str, Optional[float]]] = Field(None, description="Sub-model probabilities")
    audio_quality: Optional[Dict[str, Any]] = Field(None, description="Acoustic quality and VAD metrics")
    forensics: ForensicMetrics
    explainability: List[ExplainableSignal]
    model_explanation_note: Optional[str] = None


class BatchPredictItem(BaseModel):
    filename: str
    prediction: str
    confidence: float
    risk_score: float
    processing_time_ms: float
    error: Optional[str] = None


class BatchPredictResponse(BaseModel):
    success: bool = True
    total_processed: int
    results: List[BatchPredictItem]
    total_processing_time_ms: float


class AudioValidationResponse(BaseModel):
    valid: bool
    filename: str
    file_size_bytes: int
    mime_type: Optional[str] = None
    format: Optional[str] = None
    duration_seconds: Optional[float] = None
    sample_rate: Optional[int] = None
    channels: Optional[int] = None
    error: Optional[str] = None


class ModelInfoResponse(BaseModel):
    model_name: str
    model_version: str
    model_type: str
    input_shape: List[int]
    total_parameters: int
    device: str
    checkpoint_hash: str
    checkpoint_path: str
    is_warm: bool
    baseline_metrics: Dict[str, Any]
    supported_formats: List[str]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    model_loaded: bool
    device: str
    uptime_seconds: float
    memory_mb: float


class MultiModelDetectResponse(BaseModel):
    classification: str
    prediction: str
    spoof_probability: float
    bonafide_probability: float
    confidence: float
    risk_score: Optional[float] = None
    risk_tier: str
    risk_level: Optional[str] = None
    probability: Optional[float] = None
    audio_quality: Optional[Dict[str, Any]] = None
    windows_analyzed: Optional[int] = 1
    uncertainty: Optional[float] = None
    model_agreement: Optional[float] = None
    decision_reason: Optional[str] = None
    replay_analysis: Optional[Dict[str, Any]] = None
    voice_continuity: Optional[Dict[str, Any]] = None
    copilot_analysis: Optional[Dict[str, Any]] = None
    model_scores: Dict[str, Optional[float]]
    explanation: List[Dict[str, Any]]
    processing_time_ms: float
    model_version: str


class MetricsResponse(BaseModel):
    status: str
    models_evaluated: int
    datasets: List[str]
    metrics: Dict[str, Any]
