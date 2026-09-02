# VoiceShield API Documentation

## 1. FastAPI ML Service Endpoints (:8000)

### `POST /api/v1/detect`
Performs multi-model consensus audio deepfake detection.

**Request**:
- `file`: Multipart audio file (`.wav`, `.flac`, `.mp3`, `.ogg`, `.m4a`)
- `ref_file` *(optional)*: Enrolled genuine reference audio for speaker consistency verification
- Headers: `X-Request-ID` *(optional)*

**Response**:
```json
{
  "prediction": "spoof",
  "probability": 0.9425,
  "risk_score": 94.3,
  "risk_level": "VERY_HIGH",
  "model_scores": {
    "lcnn": 0.9512,
    "rawnet2": 0.8940,
    "aasist": 0.9634,
    "wavlm": 0.9120,
    "bilstm": 0.8750,
    "ecapa_speaker_similarity": null
  },
  "explanation": [
    {
      "signal": "Spectral Cepstral Artifacts",
      "severity": "HIGH",
      "detail": "LCNN model detected high-frequency phase and harmonic synthesis distortions (Confidence: 95.1%)"
    },
    {
      "signal": "Spectro-Temporal Graph Discontinuity",
      "severity": "HIGH",
      "detail": "AASIST graph network detected temporal-frequency relational inconsistencies across speech frames (96.3%)"
    }
  ],
  "processing_time_ms": 28.45,
  "model_version": "VoiceShield-v2.0.0-Ensemble"
}
```

### `GET /api/v1/health`
Returns service status, uptime, and memory consumption.

### `GET /api/v1/metrics`
Returns benchmark validation metrics across all 6 models and fusion ensemble.

---

## 2. Node.js API Gateway Endpoints (:5000)

- `POST /api/v1/auth/signup`: User registration with bcrypt hashing
- `POST /api/v1/auth/signin`: JWT token authentication
- `POST /api/v1/detection/analyze`: Gateway audio upload dispatching to ML service
- `GET /api/v1/history`: User past detection audit history with pagination
- `GET /api/v1/statistics`: Global threat statistics and scam mitigation counters
