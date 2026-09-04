#!/usr/bin/env bash
# ==============================================================================
# VoiceShield AI — Local Workstation Multi-Service Launcher (Bash)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo ""
echo "============================================================"
echo "         VOICESHIELD AI — STARTING LOCAL SERVICES          "
echo "============================================================"
echo ""

echo "[1/3] Starting ML Inference Service on http://127.0.0.1:8000..."
(cd "$DIR/VoiceShieldData/ml-service" && uvicorn app.main:app --host 127.0.0.1 --port 8000) &
ML_PID=$!

echo "[2/3] Starting Backend API Gateway on http://localhost:4000..."
(cd "$DIR/VoiceShieldData/backend" && npm run dev) &
BACKEND_PID=$!

echo "[3/3] Starting Frontend Web App on http://localhost:3000..."
(cd "$DIR/VoiceShieldData/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "============================================================"
echo "  Frontend:    http://localhost:3000"
echo "  Backend API: http://localhost:4000/api/v1"
echo "  ML Service:  http://127.0.0.1:8000"
echo "============================================================"
echo "Press CTRL+C to stop all services."

trap "kill $ML_PID $BACKEND_PID $FRONTEND_PID" EXIT
wait
