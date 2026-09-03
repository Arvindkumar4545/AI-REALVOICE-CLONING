"""
VoiceShield Production Multi-Model Inference Engine (Phases 6, 7, 13)
Executes:
1. Voice Activity Detection (VAD) & Audio Quality Gating
2. Multi-Window Sliding Segmentation (3.0s window, 50% overlap)
3. Multi-Model Neural Inferences (LCNN, RawNet2, AASIST, WavLM, BiLSTM, ECAPA)
4. Robust Trimmed-Mean Window Aggregation
5. Calibrated Risk Tier Scoring (0-100) & Forensic Explainability Tags
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Union, List

import numpy as np
import torch

from .constants import (
    TARGET_SR,
    CLASS_BONAFIDE,
    CLASS_SPOOF,
    CLASS_INSUFFICIENT,
    DEFAULT_WINDOW_SEC,
    DEFAULT_HOP_SEC,
)
from .features import load_and_standardize_audio, extract_lfcc, extract_prosodic_features
from .preprocessing import extract_log_mel_spectrogram
from .vad import compute_audio_quality_metrics, extract_voiced_waveform
from .models import (
    LCNN,
    RawNet2,
    AASIST,
    WavLMClassifier,
    BiLSTMProsodyModel,
    ECAPATDNN,
    VoiceShieldRiskClassifier,
    compute_speaker_consistency_score,
)
from .models.replay import detect_replay_attack
from .models.continuity import analyze_voice_continuity

logger = logging.getLogger("voiceshield.inference")

REPO_ROOT = Path(__file__).resolve().parent.parent
BASE_DIR = REPO_ROOT
DEFAULT_MODEL_PATH = REPO_ROOT / "models" / "voiceshield_best" / "model.pt"
DEFAULT_CONFIG_PATH = REPO_ROOT / "models" / "voiceshield_best" / "model_config.json"
EXPERIMENTS_ROOT = REPO_ROOT / "experiments"


class VoiceShieldInferenceEngine:
    """
    Production Multi-Model Consensus Detection Engine with VAD and sliding-window aggregation.
    """
    _instance: VoiceShieldInferenceEngine | None = None

    def __init__(self, device: str | None = None):
        self.device = torch.device(device if device else ("cuda" if torch.cuda.is_available() else "cpu"))
        
        # Initialize Sub-models
        self.lcnn = LCNN(in_channels=3, num_classes=1).to(self.device)
        self.rawnet2 = RawNet2(sinc_channels=64, num_classes=1).to(self.device)
        self.aasist = AASIST(sinc_channels=64, num_classes=1).to(self.device)
        self.wavlm = WavLMClassifier(feat_dim=128, num_layers=2, num_heads=4).to(self.device)
        self.bilstm = BiLSTMProsodyModel(in_features=8, hidden_dim=64).to(self.device)
        self.ecapa = ECAPATDNN(in_channels=40, channels=64, emb_dim=192).to(self.device)
        
        self.risk_classifier = VoiceShieldRiskClassifier()
        self.model_version = "VoiceShield-v2.0.0-Ensemble"
        self.load_checkpoints()

    @classmethod
    def get_instance(cls) -> VoiceShieldInferenceEngine:
        if cls._instance is None:
            cls._instance = VoiceShieldInferenceEngine()
        return cls._instance

    def load_checkpoints(self):
        """Loads weights for all ensemble models with graceful fallbacks."""
        repo_root = Path(__file__).resolve().parent.parent
        model_paths = {
            "lcnn": [
                repo_root / "experiments" / "improved_champion_v2" / "lcnn.pt",
                repo_root / "experiments" / "improved_model" / "model.pt",
                repo_root / "experiments" / "lcnn_lfcc" / "model.pt",
            ],
            "wavlm": [
                repo_root / "experiments" / "improved_champion_v2" / "wavlm.pt",
                repo_root / "experiments" / "improved_model" / "wavlm.pt",
                repo_root / "experiments" / "wavlm" / "model.pt",
            ],
            "bilstm": [
                repo_root / "experiments" / "improved_champion_v2" / "bilstm.pt",
                repo_root / "experiments" / "improved_model" / "bilstm.pt",
                repo_root / "experiments" / "bilstm_prosody" / "model.pt",
            ],
            "rawnet2": [repo_root / "experiments" / "rawnet2" / "model.pt"],
            "aasist": [repo_root / "experiments" / "aasist" / "model.pt"],
            "ecapa": [repo_root / "experiments" / "ecapa" / "model.pt"],
        }
        submodels = {
            "lcnn": self.lcnn,
            "wavlm": self.wavlm,
            "bilstm": self.bilstm,
            "rawnet2": self.rawnet2,
            "aasist": self.aasist,
            "ecapa": self.ecapa,
        }
        for name, paths in model_paths.items():
            submodel = submodels[name]
            loaded = False
            for path in paths:
                if path.exists():
                    try:
                        state = torch.load(str(path), map_location=self.device)
                        submodel.load_state_dict(state)
                        logger.info(f"Loaded checkpoint for {name}: {path}")
                        loaded = True
                        break
                    except Exception as e:
                        logger.warning(f"Could not load state dict for {name} from {path}: {e}")
            if not loaded:
                logger.info(f"Initialized {name} in evaluation mode with base weights.")
            submodel.eval()

    def _slice_audio_windows(
        self,
        wave: torch.Tensor,
        window_sec: float = DEFAULT_WINDOW_SEC,
        hop_sec: float = DEFAULT_HOP_SEC,
    ) -> List[torch.Tensor]:
        """Slices waveform into overlapping sliding windows."""
        window_samples = int(TARGET_SR * window_sec)
        hop_samples = int(TARGET_SR * hop_sec)
        total_samples = len(wave)

        if total_samples <= window_samples:
            # Pad to window size if shorter
            pad_amount = window_samples - total_samples
            padded = torch.nn.functional.pad(wave, (0, pad_amount))
            return [padded]

        windows = []
        start = 0
        while start + window_samples <= total_samples:
            windows.append(wave[start : start + window_samples])
            start += hop_samples

        # Ensure last chunk is included if leftover > 1 sec
        if total_samples - start >= int(TARGET_SR * 1.0):
            last_chunk = wave[-window_samples:]
            windows.append(last_chunk)

        return windows if windows else [wave[:window_samples]]

    def detect(
        self,
        audio_path_or_bytes: Union[str, Path, bytes],
        ref_audio_path_or_bytes: Union[str, Path, bytes, None] = None,
    ) -> Dict[str, Any]:
        """
        Main unified VoiceShield detection API.
        Executes VAD gating, multi-window segmentation, neural inference, and risk scoring.
        """
        t0 = time.perf_counter()

        # 1. Standardize Audio Waveform
        raw_wave = load_and_standardize_audio(audio_path_or_bytes).cpu()

        # 2. Audio Quality & Voice Activity Detection (VAD) Gating
        quality_metrics = compute_audio_quality_metrics(raw_wave, sr=TARGET_SR)
        if not quality_metrics["is_sufficient"]:
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return {
                "classification": CLASS_INSUFFICIENT,
                "prediction": "insufficient_audio",
                "spoof_probability": 0.0,
                "bonafide_probability": 0.0,
                "confidence": 0.0,
                "risk_score": None,
                "risk_tier": "INSUFFICIENT",
                "audio_quality": quality_metrics,
                "windows_analyzed": 0,
                "model_scores": {
                    "lcnn": 0.0,
                    "rawnet2": 0.0,
                    "aasist": 0.0,
                    "wavlm": 0.0,
                    "bilstm": 0.0,
                    "ecapa_speaker_similarity": None,
                },
                "explanation": [{
                    "signal": "Insufficient Speech Content",
                    "severity": "LOW",
                    "detail": quality_metrics.get("message", "Audio contains insufficient active speech for forensic analysis."),
                }],
                "latency_ms": round(elapsed_ms, 2),
                "model_version": self.model_version,
            }

        # 3. Extract Continuous Sliding Windows (standardized 3.0s window, 1.5s hop)
        windows = self._slice_audio_windows(raw_wave, window_sec=DEFAULT_WINDOW_SEC, hop_sec=DEFAULT_HOP_SEC)

        window_scores_lcnn = []
        window_scores_rawnet = []
        window_scores_aasist = []
        window_scores_wavlm = []
        window_scores_bilstm = []

        with torch.no_grad():
            for win in windows:
                win_dev = win.to(self.device)
                
                # Features for this window
                lfcc_feat = extract_lfcc(win_dev).unsqueeze(0).to(self.device)    # [1, 3, 20, T]
                prosody_feat = extract_prosodic_features(win_dev).unsqueeze(0).to(self.device) # [1, T, 8]
                raw_batch = win_dev.unsqueeze(0).to(self.device)                  # [1, T]

                # LCNN (Trained target 1 = bonafide, 0 = spoof -> spoof prob = 1 - sigmoid)
                lcnn_logit = self.lcnn(lfcc_feat, return_logits=True)
                lcnn_bonafide = float(torch.sigmoid(lcnn_logit)[0].item())
                window_scores_lcnn.append(1.0 - lcnn_bonafide)

                # RawNet2
                rawnet_logit = self.rawnet2(raw_batch, return_logits=True)
                rawnet_bonafide = float(torch.sigmoid(rawnet_logit)[0].item())
                window_scores_rawnet.append(1.0 - rawnet_bonafide)

                # AASIST
                aasist_logit = self.aasist(raw_batch, return_logits=True)
                aasist_bonafide = float(torch.sigmoid(aasist_logit)[0].item())
                window_scores_aasist.append(1.0 - aasist_bonafide)

                # WavLM
                wavlm_logit = self.wavlm(raw_batch, return_logits=True)
                wavlm_bonafide = float(torch.sigmoid(wavlm_logit)[0].item())
                window_scores_wavlm.append(1.0 - wavlm_bonafide)

                # BiLSTM Prosody
                bilstm_logit = self.bilstm(prosody_feat, return_logits=True)
                bilstm_bonafide = float(torch.sigmoid(bilstm_logit)[0].item())
                window_scores_bilstm.append(1.0 - bilstm_bonafide)

        # Robust Aggregation across Windows (Max-Weighted Mean)
        def robust_aggregate(scores: List[float]) -> float:
            if not scores:
                return 0.50
            max_s = float(max(scores))
            mean_s = float(np.mean(scores))
            # If any window exhibits severe synthetic acoustic anomalies (>= 0.70), elevate weighting
            if max_s >= 0.70:
                return float(np.clip(0.65 * max_s + 0.35 * mean_s, 0.0, 0.999))
            return mean_s

        agg_lcnn = robust_aggregate(window_scores_lcnn)
        agg_rawnet = robust_aggregate(window_scores_rawnet)
        agg_aasist = robust_aggregate(window_scores_aasist)
        agg_wavlm = robust_aggregate(window_scores_wavlm)
        agg_bilstm = robust_aggregate(window_scores_bilstm)

        # 4. ECAPA Speaker Verification (if reference voice provided)
        speaker_sim = None
        if ref_audio_path_or_bytes is not None:
            try:
                ref_wave = load_and_standardize_audio(ref_audio_path_or_bytes).to(self.device)
                ref_mel = extract_log_mel_spectrogram(ref_wave, augment=False).to(self.device)
                test_mel = extract_log_mel_spectrogram(raw_wave.to(self.device), augment=False).to(self.device)
                speaker_sim = compute_speaker_consistency_score(self.ecapa, test_mel, ref_mel)
            except Exception as e:
                logger.warning(f"ECAPA verification error: {e}")

        model_scores = {
            "lcnn": round(float(np.clip(agg_lcnn, 0.001, 0.999)), 4),
            "rawnet2": round(float(np.clip(agg_rawnet, 0.001, 0.999)), 4),
            "aasist": round(float(np.clip(agg_aasist, 0.001, 0.999)), 4),
            "wavlm": round(float(np.clip(agg_wavlm, 0.001, 0.999)), 4),
            "bilstm": round(float(np.clip(agg_bilstm, 0.001, 0.999)), 4),
        }

        # 5. Acoustic Replay Attack Analysis (Feature 5)
        replay_result = detect_replay_attack(raw_wave, sr=TARGET_SR)

        # 6. Voice Continuity & Window-by-Window Consistency (Feature 4)
        continuity_result = analyze_voice_continuity(
            window_scores=window_scores_lcnn,
            window_sec=DEFAULT_WINDOW_SEC,
            hop_sec=DEFAULT_HOP_SEC,
        )

        # 7. Consensus Risk Score & Explainability Calculation
        risk_result = self.risk_classifier.compute_risk(
            model_scores=model_scores,
            speaker_consistency=speaker_sim,
            audio_quality=quality_metrics,
            replay_metrics=replay_result,
        )

        suspicious_windows = sum(1 for s in window_scores_lcnn if s > 0.50)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        return {
            "classification": risk_result["classification"],
            "prediction": risk_result["prediction"],
            "probability": risk_result.get("probability", risk_result["spoof_probability"]),
            "spoof_probability": risk_result["spoof_probability"],
            "bonafide_probability": risk_result["bonafide_probability"],
            "confidence": risk_result["confidence"],
            "uncertainty": risk_result.get("uncertainty", 0.15),
            "risk_score": risk_result["risk_score"],
            "risk_tier": risk_result["risk_tier"],
            "risk_level": risk_result["risk_tier"],
            "audio_quality": quality_metrics,
            "windows_analyzed": len(windows),
            "suspicious_windows": suspicious_windows,
            "window_scores": [round(float(s), 4) for s in window_scores_lcnn],
            "model_agreement": risk_result.get("model_agreement", 1.0),
            "is_disagreement": risk_result.get("is_disagreement", False),
            "decision_reason": risk_result.get("decision_reason", "Forensic acoustic analysis completed."),
            "model_scores": {
                **model_scores,
                "ecapa_speaker_similarity": round(speaker_sim, 4) if speaker_sim is not None else None,
                "replay_probability": replay_result["replay_probability"],
            },
            "replay_analysis": replay_result,
            "voice_continuity": continuity_result,
            "explanation": risk_result["explanation"],
            "latency_ms": round(elapsed_ms, 2),
            "model_version": self.model_version,
        }

    def predict(self, audio_source: Union[str, Path, bytes], threshold_override: float | None = None) -> Dict[str, Any]:
        """Backward-compatible inference endpoint."""
        res = self.detect(audio_source)
        return {
            "classification": res.get("classification", CLASS_BONAFIDE),
            "prediction": res["prediction"],
            "probability": res.get("probability", 0.0),
            "spoof_probability": round((res.get("spoof_probability") or 0.0) * 100.0, 2),
            "bonafide_probability": round((res.get("bonafide_probability") or 1.0) * 100.0, 2),
            "confidence": res.get("confidence", 0.90),
            "uncertainty": res.get("uncertainty", 0.15),
            "risk_score": res["risk_score"],
            "risk_tier": res.get("risk_tier", "LOW"),
            "model_agreement": res.get("model_agreement", 1.0),
            "decision_reason": res.get("decision_reason", ""),
            "audio_quality": res.get("audio_quality"),
            "windows_analyzed": res.get("windows_analyzed", 1),
            "suspicious_windows": res.get("suspicious_windows", 0),
            "model_version": self.model_version,
            "latency_ms": res["latency_ms"],
        }


def detect_audio(audio_path: str | Path | bytes, ref_audio_path: str | Path | bytes | None = None) -> Dict[str, Any]:
    engine = VoiceShieldInferenceEngine.get_instance()
    return engine.detect(audio_path, ref_audio_path_or_bytes=ref_audio_path)

def load_model(model_path: str | Path = DEFAULT_MODEL_PATH, config_path: str | Path = DEFAULT_CONFIG_PATH):
    engine = VoiceShieldInferenceEngine.get_instance()
    return engine.lcnn

def predict_audio(audio_path: str | Path, model_path: str | Path = DEFAULT_MODEL_PATH):
    engine = VoiceShieldInferenceEngine.get_instance()
    return engine.predict(audio_path)



