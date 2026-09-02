# ==============================================================================
# VoiceShield FastAPI PyTorch ML Service Dockerfile
# ==============================================================================
FROM python:3.12-slim

WORKDIR /app

# System audio dependencies for librosa and soundfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./app

EXPOSE 8000

ENV PYTHONPATH=/app
ENV MODEL_PATH=/app/models/voiceshield_best/model.pt

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
