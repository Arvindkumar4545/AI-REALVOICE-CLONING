"""
Health and Telemetry Monitoring for VoiceShield ML Service
"""
from __future__ import annotations

import os
import time
import psutil
import torch

START_TIME = time.time()


def get_system_health(model_loaded: bool) -> dict:
    """
    Returns live system telemetry for the ML service.
    """
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    memory_mb = round(memory_info.rss / (1024 * 1024), 2)
    uptime = round(time.time() - START_TIME, 2)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    device_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"

    return {
        "status": "healthy" if model_loaded else "degraded",
        "service": "VoiceShield ML Service",
        "version": "1.0.0",
        "model_loaded": model_loaded,
        "device": device,
        "device_name": device_name,
        "uptime_seconds": uptime,
        "memory_mb": memory_mb,
        "cpu_percent": psutil.cpu_percent(interval=None),
    }
