"""
Inference Engine and Model Manager for VoiceShield
Loads AudioSpoofNet checkpoint, executes PyTorch forward pass, and formats predictions.
"""
from __future__ import annotations

import hashlib
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional

import numpy as np
import torch

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from .model import AudioSpoofNet, AudioSpoofNetV2
from .preprocessing import (
    load_audio_array,
    extract_mel_spectrogram_tensor,
    validate_audio_file,
    TARGET_SR,
)
from .forensics import compute_forensic_metrics, generate_explainable_signals
from .schemas import PredictResponse, ForensicMetrics

logger = logging.getLogger("voiceshield.inference")

DEFAULT_CHECKPOINT_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "voiceshield_best" / "model.pt"
BASELINE_METRICS_PATH = Path(__file__).resolve().parent.parent.parent / "artifacts" / "baseline" / "metrics.json"
BASELINE_CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "artifacts" / "baseline" / "config.json"


class ModelManager:
    """
    Singleton manager for loading and caching the AudioSpoofNet PyTorch model.
    """
    _instance: Optional[ModelManager] = None

    def __init__(self, checkpoint_path: Path = DEFAULT_CHECKPOINT_PATH):
        self.checkpoint_path = Path(checkpoint_path)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model: Optional[AudioSpoofNet] = None
        self.checkpoint_hash: str = "unknown"
        self.model_name = "AudioSpoofNet"
        self.model_version = "v1.0.0-baseline"
        self.is_warm = False
        self.baseline_metrics: Dict[str, Any] = {}
        self.training_config: Dict[str, Any] = {}

    @classmethod
    def get_instance(cls, checkpoint_path: Path = DEFAULT_CHECKPOINT_PATH) -> ModelManager:
        if cls._instance is None:
            cls._instance = cls(checkpoint_path)
            cls._instance.initialize()
        return cls._instance

    def initialize(self) -> None:
        """Loads weights, computes checksum, reads metadata, and warms up inference."""
        logger.info(f"Initializing ModelManager from checkpoint: {self.checkpoint_path}")
        if not self.checkpoint_path.exists():
            # Check fallback directory
            fallback = Path(r"F:\VoiceShieldData\models\voiceshield_best\model.pt")
            if fallback.exists():
                self.checkpoint_path = fallback
            else:
                logger.error(f"Checkpoint not found at: {self.checkpoint_path}")
                raise FileNotFoundError(f"Checkpoint file does not exist: {self.checkpoint_path}")

        # Compute SHA256
        with open(self.checkpoint_path, "rb") as f:
            self.checkpoint_hash = hashlib.sha256(f.read()).hexdigest()[:16]

        # Load state dict
        state = torch.load(str(self.checkpoint_path), map_location=self.device)
        if any("stage1" in k or "stem" in k for k in state.keys()):
            model = AudioSpoofNetV2()
            self.model_name = "AudioSpoofNetV2"
            self.model_version = "v2.0.0-champion"
        else:
            model = AudioSpoofNet()
            self.model_name = "AudioSpoofNet"
            self.model_version = "v1.0.0-baseline"

        model.load_state_dict(state)
        model.to(self.device)
        model.eval()
        self.model = model

        # Load baseline artifacts
        if BASELINE_METRICS_PATH.exists():
            try:
                with open(BASELINE_METRICS_PATH, "r", encoding="utf-8") as f:
                    self.baseline_metrics = json.load(f)
            except Exception as e:
                logger.warning(f"Could not read baseline metrics: {e}")

        if BASELINE_CONFIG_PATH.exists():
            try:
                with open(BASELINE_CONFIG_PATH, "r", encoding="utf-8") as f:
                    self.training_config = json.load(f)
            except Exception as e:
                logger.warning(f"Could not read baseline config: {e}")

        # Warm up
        self.warmup()
        logger.info(f"ModelManager initialized successfully. Checkpoint hash: {self.checkpoint_hash}")

    def warmup(self) -> None:
        """Runs a synthetic dummy forward pass to warm up PyTorch and JIT compilers."""
        if self.model is None:
            return
        dummy = torch.randn(1, 1, 40, 96, device=self.device)
        with torch.no_grad():
            _ = self.model(dummy)
        self.is_warm = True

    def predict(
        self,
        audio_bytes: bytes,
        filename: str,
        request_id: str,
    ) -> PredictResponse:
        """
        Executes calibrated multi-model consensus detection pipeline with sliding windows and VAD gating.
        """
        start_time = time.perf_counter()

        # 1. Validation & Header Info
        validation = validate_audio_file(audio_bytes, filename)
        if not validation["valid"]:
            raise ValueError(validation["error"])

        orig_duration = validation.get("duration_seconds")
        orig_sr = validation.get("sample_rate")
        channels = validation.get("channels", 1)

        # 2. Audio Loading & Resampling for forensics
        y, sr = load_audio_array(audio_bytes, sr=TARGET_SR)

        # 3. Multi-Model Consensus Inference Engine
        from voice_shield.inference import VoiceShieldInferenceEngine
        engine = VoiceShieldInferenceEngine.get_instance()
        det_res = engine.detect(audio_path_or_bytes=audio_bytes)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        classification_str = det_res.get("classification", "BONA_FIDE")
        prediction_val = "SPOOF" if classification_str == "SPOOF" else ("UNCERTAIN" if classification_str == "UNCERTAIN" else "BONA_FIDE")
        if classification_str == "INSUFFICIENT_AUDIO":
            prediction_val = "INSUFFICIENT_AUDIO"

        calibrated_spoof_prob = float(det_res.get("spoof_probability") or 0.0)
        calibrated_bonafide_prob = float(det_res.get("bonafide_probability") or 1.0)
        confidence_val = float((det_res.get("confidence") or 0.85) * 100.0)
        risk_score_val = det_res.get("risk_score")

        # 4. Acoustic Forensics & Explainability
        forensics = compute_forensic_metrics(
            y=y,
            sr=sr,
            orig_duration=orig_duration,
            orig_sr=orig_sr,
            channels=channels,
        )
        explainability = generate_explainable_signals(
            metrics=forensics,
            prediction=prediction_val,
            confidence=round(confidence_val, 2),
            risk_score=risk_score_val if risk_score_val is not None else 0.0,
        )

        return PredictResponse(
            success=True,
            request_id=request_id,
            filename=filename,
            file_size_bytes=len(audio_bytes),
            prediction=prediction_val,
            classification=classification_str,
            confidence=round(confidence_val, 2),
            uncertainty=det_res.get("uncertainty", 0.15),
            risk_score=risk_score_val,
            risk_tier=det_res.get("risk_tier", "LOW"),
            spoof_probability=round(calibrated_spoof_prob * 100.0, 2),
            bona_fide_probability=round(calibrated_bonafide_prob * 100.0, 2),
            raw_probability=round(calibrated_spoof_prob, 4),
            processing_time_ms=round(elapsed_ms, 2),
            model_name="VoiceShield-v2.0.0-Ensemble",
            model_version="v2.0.0-champion",
            checkpoint_hash=self.checkpoint_hash,
            model_agreement=det_res.get("model_agreement", 1.0),
            decision_reason=det_res.get("decision_reason", "Multi-model acoustic analysis completed."),
            windows_analyzed=det_res.get("windows_analyzed", 1),
            suspicious_windows=det_res.get("suspicious_windows", 0),
            model_scores=det_res.get("model_scores"),
            audio_quality=det_res.get("audio_quality"),
            forensics=forensics,
            explainability=explainability,
            model_explanation_note=det_res.get("decision_reason") or "Explainability indicators reflect physical signal forensics and multi-model consensus confidence.",
        )
