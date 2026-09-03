"""
VoiceShield Voice Continuity & Window-by-Window Temporal Consistency Analysis (Feature 4 & 12)
Splits long audio streams into sliding time windows (0-3s, 3-6s, 6-9s, 9-12s, etc.)
and monitors:
1. Speaker representation continuity across windows
2. Spectral and prosodic stability
3. Abrupt acoustic shifts indicating identity or vocoder switching
"""
from __future__ import annotations

from typing import List, Dict, Any
import numpy as np
import torch


def analyze_voice_continuity(
    window_scores: List[float],
    window_sec: float = 3.0,
    hop_sec: float = 1.5,
) -> Dict[str, Any]:
    """
    Analyzes consistency across sliding windows and detects transitions.
    Returns segment-by-segment timeline and transition alerts.
    """
    if not window_scores:
        return {
            "segments": [],
            "has_transition": False,
            "transition_timestamp": None,
            "continuity_score": 100.0,
            "summary": "Insufficient audio for continuity tracking."
        }

    segments = []
    transition_detected = False
    transition_sec = None

    for idx, score in enumerate(window_scores):
        start_t = idx * hop_sec
        end_t = start_t + window_sec

        if score >= 0.70:
            status = "Synthetic anomaly"
            quality_tag = "SYNTHETIC"
        elif score >= 0.45:
            status = "Suspicious / Borderline"
            quality_tag = "BORDERLINE"
        else:
            status = "Genuine-like"
            quality_tag = "GENUINE"

        segments.append({
            "segment_index": idx + 1,
            "time_range": f"{start_t:.1f}s - {end_t:.1f}s",
            "start_sec": round(start_t, 1),
            "end_sec": round(end_t, 1),
            "spoof_score": round(float(score), 3),
            "status": status,
            "quality_tag": quality_tag,
        })

    # Check for significant delta transitions between consecutive windows
    for i in range(1, len(window_scores)):
        delta = abs(window_scores[i] - window_scores[i - 1])
        if delta >= 0.40:
            transition_detected = True
            transition_sec = round(i * hop_sec, 1)
            break

    # Calculate overall session consistency score (0 - 100)
    variance = float(np.var(window_scores)) if len(window_scores) > 1 else 0.0
    continuity_score = float(np.clip(100.0 - (variance * 150.0), 20.0, 100.0))

    if transition_detected:
        summary = f"Significant voice-characteristic shift detected around {transition_sec:.1f}s."
    elif any(s["quality_tag"] == "SYNTHETIC" for s in segments):
        summary = "Continuous synthetic acoustic artifacts present across multiple segments."
    else:
        summary = "Acoustic characteristics remain stable and consistent throughout session."

    return {
        "segments": segments,
        "has_transition": transition_detected,
        "transition_timestamp": transition_sec,
        "continuity_score": round(continuity_score, 1),
        "summary": summary,
    }
