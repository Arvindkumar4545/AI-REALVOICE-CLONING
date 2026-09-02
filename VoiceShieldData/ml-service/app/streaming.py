"""
VoiceShield Streaming Detection Engine
Handles real-time audio chunk scoring with fast-path (LCNN) and slow-path (full consensus).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import deque
from typing import Dict, Any, Optional
import numpy as np
import torch
from pathlib import Path

from .inference import ModelManager

logger = logging.getLogger("voiceshield.streaming")

# Constants
SAMPLE_RATE = 16000
FAST_PATH_INTERVAL_CHUNKS = 1  # Run LCNN on every chunk
SLOW_PATH_INTERVAL_CHUNKS = 5  # Run full consensus every 5 chunks (~7.5s at 1.5s/chunk)
MAX_BUFFER_DURATION_SEC = 15
BUFFER_SIZE_SAMPLES = SAMPLE_RATE * MAX_BUFFER_DURATION_SEC


class StreamingSession:
    """Manages per-session state for real-time audio streaming."""
    
    def __init__(self, session_id: str, model_manager: ModelManager):
        self.session_id = session_id
        self.model_manager = model_manager
        
        # Audio buffer (rolling, keeps last 15 seconds)
        self.audio_buffer: deque = deque(maxlen=BUFFER_SIZE_SAMPLES)
        
        # Chunk tracking
        self.chunk_count = 0
        self.score_timeline: list = []
        
        # Session metadata
        self.start_time = time.time()
        self.last_fast_score = None
        self.last_slow_score = None
        self.flagged_segments: list = []
        
        logger.info(f"[Session {session_id}] Streaming session created")
    
    def add_chunk(self, pcm_data: np.ndarray) -> None:
        """Add PCM chunk to buffer."""
        # Ensure float32
        if pcm_data.dtype != np.float32:
            pcm_data = pcm_data.astype(np.float32) / 32768.0 if pcm_data.dtype == np.int16 else pcm_data.astype(np.float32)
        
        self.audio_buffer.extend(pcm_data.flatten())
        self.chunk_count += 1
    
    def get_buffer_as_tensor(self) -> torch.Tensor:
        """Return current buffer as PyTorch tensor."""
        if len(self.audio_buffer) == 0:
            return torch.zeros(SAMPLE_RATE, dtype=torch.float32)
        
        audio_np = np.array(list(self.audio_buffer), dtype=np.float32)
        return torch.from_numpy(audio_np)
    
    def elapsed_seconds(self) -> float:
        """Return elapsed time since session start."""
        return time.time() - self.start_time
    
    def record_score(self, score_type: str, risk_score: float, 
                    model_breakdown: Optional[Dict[str, float]] = None,
                    explanation: Optional[list] = None,
                    latency_ms: float = 0.0) -> Dict[str, Any]:
        """Record a score in the timeline."""
        record = {
            "ts_ms": int(self.elapsed_seconds() * 1000),
            "type": score_type,  # "fast" or "slow"
            "risk_score": round(risk_score, 4),
            "latency_ms": round(latency_ms, 2),
        }
        
        if model_breakdown:
            record["model_breakdown"] = {k: round(v, 4) for k, v in model_breakdown.items()}
        if explanation:
            record["explanation"] = explanation
        
        self.score_timeline.append(record)
        
        # Check for flagging
        if risk_score > 0.70 and score_type == "slow":
            self.flagged_segments.append({
                "start_ms": record["ts_ms"] - 10000,
                "end_ms": record["ts_ms"],
                "reason": explanation[0]["signal"] if explanation else "High risk detected",
                "confidence": model_breakdown.get("model_agreement", 0.5) if model_breakdown else 0.5
            })
        
        return record
    
    def finalize(self) -> Dict[str, Any]:
        """Generate final session verdict."""
        if not self.score_timeline:
            return {
                "sessionId": self.session_id,
                "finalVerdict": "INSUFFICIENT_AUDIO",
                "durationMs": int(self.elapsed_seconds() * 1000),
                "summary": {
                    "maxRiskScore": 0.0,
                    "avgRiskScore": 0.0,
                    "flaggedSegments": []
                }
            }
        
        risk_scores = [s["risk_score"] for s in self.score_timeline if s["type"] == "slow"]
        max_risk = max(risk_scores) if risk_scores else 0.0
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0
        
        # Determine final classification
        if max_risk > 0.70:
            final_verdict = "SPOOF"
        elif max_risk > 0.35:
            final_verdict = "UNCERTAIN"
        else:
            final_verdict = "BONA_FIDE"
        
        return {
            "sessionId": self.session_id,
            "finalVerdict": final_verdict,
            "durationMs": int(self.elapsed_seconds() * 1000),
            "scoreTimeline": self.score_timeline,
            "summary": {
                "maxRiskScore": round(max_risk, 4),
                "avgRiskScore": round(avg_risk, 4),
                "flaggedSegments": self.flagged_segments
            }
        }


class StreamingDetectionEngine:
    """Manages multiple concurrent streaming sessions."""
    
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.sessions: Dict[str, StreamingSession] = {}
    
    def create_session(self, session_id: str) -> StreamingSession:
        """Create a new streaming session."""
        session = StreamingSession(session_id, self.model_manager)
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[StreamingSession]:
        """Retrieve an active session."""
        return self.sessions.get(session_id)
    
    def close_session(self, session_id: str) -> None:
        """Close and clean up a session."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.info(f"[Session {session_id}] Session closed")
    
    async def run_fast_path(self, session: StreamingSession, pcm_chunk: np.ndarray) -> Dict[str, Any]:
        """Fast-path: LCNN only on current chunk (~50-100ms)."""
        start = time.perf_counter()
        
        try:
            # Run LCNN inference on chunk
            chunk_tensor = torch.from_numpy(pcm_chunk.astype(np.float32)).unsqueeze(0).to(self.model_manager.device)
            
            with torch.no_grad():
                lcnn_logit = self.model_manager.lcnn(chunk_tensor, return_logits=True)
                lcnn_bonafide = float(torch.sigmoid(lcnn_logit)[0].item())
                lcnn_spoof_prob = 1.0 - lcnn_bonafide
            
            latency_ms = (time.perf_counter() - start) * 1000.0
            
            session.last_fast_score = lcnn_spoof_prob
            
            return {
                "type": "chunk_score",
                "seq": session.chunk_count,
                "riskScore": round(lcnn_spoof_prob, 4),
                "confidence": 0.6,  # Fast path has lower confidence
                "latencyMs": round(latency_ms, 2)
            }
        except Exception as e:
            logger.error(f"[Session {session.session_id}] Fast-path error: {e}")
            return {"type": "error", "message": str(e)}
    
    async def run_slow_path(self, session: StreamingSession) -> Dict[str, Any]:
        """Slow-path: Full 6-model consensus on accumulated buffer (~300ms)."""
        start = time.perf_counter()
        
        try:
            # Get current buffer
            audio_tensor = session.get_buffer_as_tensor()
            
            # Run full inference
            result = self.model_manager.predict(audio_tensor.cpu().numpy())
            
            latency_ms = (time.perf_counter() - start) * 1000.0
            
            session.last_slow_score = result.get("spoof_probability", 0.5)
            
            model_breakdown = result.get("model_scores", {})
            explanation = result.get("explanation", [])
            
            session.record_score(
                "slow",
                result.get("spoof_probability", 0.5),
                model_breakdown=model_breakdown,
                explanation=explanation,
                latency_ms=latency_ms
            )
            
            return {
                "type": "consensus_update",
                "seq": session.chunk_count,
                "riskScore": round(result.get("spoof_probability", 0.5), 4),
                "classification": result.get("classification", "UNCERTAIN"),
                "modelBreakdown": {k: round(v, 4) for k, v in model_breakdown.items()},
                "explanation": explanation,
                "latencyMs": round(latency_ms, 2)
            }
        except Exception as e:
            logger.error(f"[Session {session.session_id}] Slow-path error: {e}")
            return {"type": "error", "message": str(e)}
