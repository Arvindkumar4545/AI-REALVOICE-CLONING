"""
FastAPI backend for VoiceShield - AI Audio Deepfake Detection
"""

import os
import sys
import asyncio
import tempfile
from pathlib import Path
from typing import Optional
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import aiofiles

# Add the parent directory to the Python path to import voice_shield
sys.path.insert(0, str(Path(__file__).parent.parent))

from voice_shield.inference import predict_audio, load_model

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="VoiceShield API",
    description="AI-powered audio deepfake detection API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".wav", ".flac", ".mp3", ".ogg", ".m4a", ".webm", ".aac"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB

# Global variables for caching
model_cache = {"model": None, "path": None}


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    logger.info("VoiceShield API starting up...")
    try:
        # Pre-load the model to check if it exists
        model = load_model()
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "VoiceShield API",
        "version": "1.0.0"
    }


@app.get("/api/model")
async def get_model_info():
    """Get model information and performance metrics"""
    try:
        config_path = Path(__file__).parent.parent / "artifacts" / "baseline" / "config.json"
        metrics_path = Path(__file__).parent.parent / "artifacts" / "baseline" / "metrics.json"
        
        import json
        
        config = {}
        metrics = {}
        
        if config_path.exists():
            with open(config_path) as f:
                config = json.load(f)
        
        if metrics_path.exists():
            with open(metrics_path) as f:
                metrics = json.load(f)
        
        return {
            "model_name": "AudioSpoofNet",
            "model_type": "CNN-based Audio Classifier",
            "input_shape": [1, 40, 96],
            "parameters": 167329,
            "training_config": config,
            "metrics": {
                **metrics,
                "status": "Baseline Research Result - Not production-ready",
                "note": "Class imbalance affects precision/recall/f1 metrics"
            }
        }
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        return {"error": str(e)}, 500


@app.get("/api/datasets")
async def get_datasets_info():
    """Get information about available datasets"""
    try:
        manifest_path = Path(__file__).parent.parent / "manifests" / "dataset_manifest.csv"
        
        if not manifest_path.exists():
            return {"error": "Dataset manifest not found"}, 404
        
        import pandas as pd
        manifest = pd.read_csv(manifest_path)
        
        # Count statistics
        total_samples = len(manifest)
        sources = manifest["source"].unique().tolist() if "source" in manifest.columns else []
        datasets = manifest["dataset"].unique().tolist() if "dataset" in manifest.columns else []
        labels = manifest["label"].unique().tolist() if "label" in manifest.columns else []
        
        label_counts = {}
        if "label" in manifest.columns:
            label_counts = manifest["label"].value_counts().to_dict()
        
        split_counts = {}
        if "split" in manifest.columns:
            split_counts = manifest["split"].value_counts().to_dict()
        
        return {
            "total_samples": total_samples,
            "sources": sources,
            "datasets": datasets,
            "label_distribution": label_counts,
            "split_distribution": split_counts,
            "columns": manifest.columns.tolist()
        }
    except Exception as e:
        logger.error(f"Error getting datasets info: {e}")
        return {"error": str(e)}, 500


@app.post("/api/audio/validate")
@app.post("/api/v1/detection/validate")
async def validate_audio(file: UploadFile = File(...)):
    """Validate audio file format and size"""
    try:
        # Check file extension
        filename = file.filename or "audio.wav"
        file_ext = Path(filename).suffix.lower()
        if not file_ext and file.content_type:
            if "webm" in file.content_type:
                file_ext = ".webm"
            elif "wav" in file.content_type:
                file_ext = ".wav"
            elif "mp3" in file.content_type or "mpeg" in file.content_type:
                file_ext = ".mp3"
            elif "ogg" in file.content_type:
                file_ext = ".ogg"
            elif "flac" in file.content_type:
                file_ext = ".flac"
            elif "mp4" in file.content_type or "m4a" in file.content_type:
                file_ext = ".m4a"

        if file_ext not in ALLOWED_EXTENSIONS:
            return {
                "valid": False,
                "error": {
                    "code": "UNSUPPORTED_AUDIO",
                    "message": f"File type {file_ext} not supported. Supported: {sorted(list(ALLOWED_EXTENSIONS))}",
                    "supported_formats": sorted(list(ALLOWED_EXTENSIONS))
                }
            }
        
        # Check file size (read first to check size)
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            return {
                "valid": False,
                "error": {
                    "code": "FILE_TOO_LARGE",
                    "message": f"File size {file_size} exceeds limit of {MAX_FILE_SIZE} bytes"
                }
            }
        
        if file_size == 0:
            return {
                "valid": False,
                "error": {
                    "code": "EMPTY_FILE",
                    "message": "File is empty"
                }
            }
        
        return {
            "valid": True,
            "filename": filename,
            "file_size": file_size,
            "file_type": file_ext
        }
    except Exception as e:
        logger.error(f"Error validating audio: {e}")
        return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": str(e)}}


@app.post("/api/detect")
@app.post("/api/v1/detect")
@app.post("/api/v1/detection")
@app.post("/predict")
async def detect_spoofing(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Detect audio spoofing/deepfake.
    
    Accepts audio files in WAV, FLAC, MP3, OGG, M4A, WEBM formats.
    Returns classification and confidence scores.
    """
    temp_file_path = None
    
    try:
        # Validate file
        filename = file.filename or "recording.webm"
        file_ext = Path(filename).suffix.lower()
        if not file_ext and file.content_type:
            if "webm" in file.content_type:
                file_ext = ".webm"
            elif "wav" in file.content_type:
                file_ext = ".wav"
            elif "mp3" in file.content_type or "mpeg" in file.content_type:
                file_ext = ".mp3"
            elif "ogg" in file.content_type:
                file_ext = ".ogg"
            elif "flac" in file.content_type:
                file_ext = ".flac"
            elif "m4a" in file.content_type or "mp4" in file.content_type:
                file_ext = ".m4a"
            else:
                file_ext = ".webm"

        if file_ext not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": {
                        "code": "UNSUPPORTED_AUDIO",
                        "message": f"Unsupported audio format: {file_ext}. Supported: {sorted(list(ALLOWED_EXTENSIONS))}",
                        "supported_formats": sorted(list(ALLOWED_EXTENSIONS))
                    }
                }
            )
        
        # Read file contents
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=413,
                content={
                    "success": False,
                    "error": {
                        "code": "FILE_TOO_LARGE",
                        "message": f"File too large. Maximum size: {MAX_FILE_SIZE} bytes"
                    }
                }
            )
        
        if len(contents) == 0:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": {
                        "code": "EMPTY_FILE",
                        "message": "Uploaded file is empty (0 bytes)"
                    }
                }
            )
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(
            suffix=file_ext,
            delete=False,
            dir=UPLOAD_DIR
        )
        temp_file_path = temp_file.name
        
        async with aiofiles.open(temp_file_path, "wb") as f:
            await f.write(contents)
        
        # Run inference
        result = predict_audio(temp_file_path)
        
        # Schedule cleanup of temporary file
        if background_tasks:
            background_tasks.add_task(cleanup_temp_file, temp_file_path)
        else:
            # Cleanup immediately if no background tasks
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
        
        pred_str = str(result.get("prediction", "bonafide")).upper()
        classification_val = "SPOOF" if pred_str == "SPOOF" else ("INSUFFICIENT_AUDIO" if "INSUFFICIENT" in pred_str else "BONA_FIDE")
        spoof_prob = float(result.get("spoof_probability", 0.0))
        bonafide_prob = float(result.get("bonafide_probability", 100.0 - spoof_prob))
        conf_val = float(result.get("confidence", 0.90))
        latency = float(result.get("latency_ms", result.get("processing_time_ms", 0.0)))
        risk_score = result.get("risk_score")

        return {
            "success": True,
            "filename": filename,
            "file_size": len(contents),
            "classification": classification_val,
            "prediction": pred_str.lower(),
            "confidence": round(conf_val if conf_val <= 1.0 else conf_val, 2),
            "risk_score": risk_score,
            "risk_tier": result.get("risk_tier", "LOW"),
            "spoof_probability": round(spoof_prob, 2),
            "bona_fide_probability": round(bonafide_prob, 2),
            "raw_probability": round(spoof_prob / 100.0, 4),
            "processing_time_ms": round(latency, 2),
            "audio_quality": result.get("audio_quality"),
            "model_version": result.get("model_version", "VoiceShield-v2.0.0-Ensemble")
        }
    
    except Exception as e:
        logger.error(f"Error during detection: {e}", exc_info=True)
        
        # Cleanup on error
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "PROCESSING_ERROR",
                    "message": f"Error processing audio: {str(e)}"
                }
            }
        )


@app.get("/api/statistics")
async def get_statistics():
    """Get usage statistics (placeholder for future database integration)"""
    return {
        "total_analyses": 0,
        "spoof_detected": 0,
        "bona_fide": 0,
        "average_confidence": 0,
        "note": "Statistics database not yet implemented"
    }


def cleanup_temp_file(file_path: str):
    """Clean up temporary file"""
    try:
        if Path(file_path).exists():
            Path(file_path).unlink()
            logger.info(f"Cleaned up temporary file: {file_path}")
    except Exception as e:
        logger.error(f"Error cleaning up temporary file: {e}")


@app.get("/")
async def root():
    """API root"""
    return {
        "name": "VoiceShield API",
        "version": "1.0.0",
        "description": "AI-powered audio deepfake detection",
        "endpoints": {
            "health": "/api/health",
            "detect": "/api/detect",
            "model": "/api/model",
            "datasets": "/api/datasets",
            "statistics": "/api/statistics",
            "validate": "/api/audio/validate"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True
    )
