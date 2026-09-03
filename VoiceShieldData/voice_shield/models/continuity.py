from typing import List, Dict, Any

def analyze_voice_continuity(
    window_scores: List[float],
    window_sec: float = 3.0,
    hop_sec: float = 1.5,
) -> Dict[str, Any]:
    """
    Sequential sliding window consistency analyzer for continuous voice tracking.
    """
    if not window_scores:
        return {
            "is_continuous": True,
            "abrupt_transitions": 0,
            "details": []
        }

    abrupt_transitions = 0
    details = []
    
    # Calculate differences between adjacent windows
    for i in range(1, len(window_scores)):
        diff = abs(window_scores[i] - window_scores[i - 1])
        if diff > 0.40:
            abrupt_transitions += 1
            timestamp = i * hop_sec
            details.append({
                "timestamp_sec": timestamp,
                "message": f"Voice-characteristic shift detected around {timestamp:.1f}s",
                "score_diff": round(diff, 4)
            })

    is_continuous = abrupt_transitions == 0

    return {
        "is_continuous": is_continuous,
        "abrupt_transitions": abrupt_transitions,
        "details": details
    }
