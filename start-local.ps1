# ==============================================================================
# VoiceShield AI — Local Workstation Multi-Service Launcher
# ==============================================================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "         VOICESHIELD AI — STARTING LOCAL SERVICES          " -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Start ML Inference Microservice (Port 8000)
Write-Host "[1/3] Starting ML Inference Service on http://127.0.0.1:8000..." -ForegroundColor Green
$mlProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\VoiceShieldData\ml-service'; uvicorn app.main:app --host 127.0.0.1 --port 8000" -PassThru

# 2. Start Backend API Gateway (Port 4000)
Write-Host "[2/3] Starting Backend API Gateway on http://localhost:4000..." -ForegroundColor Green
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\VoiceShieldData\backend'; npm run dev" -PassThru

# 3. Start Frontend Web Application (Port 3000)
Write-Host "[3/3] Starting Frontend Web App on http://localhost:3000..." -ForegroundColor Green
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\VoiceShieldData\frontend'; npm run dev" -PassThru

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "                 SERVICES ARE STARTING UP                   " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:4000/api/v1" -ForegroundColor White
Write-Host "  ML Service:  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "============================================================`n" -ForegroundColor Cyan
Write-Host "To stop the services, simply close the opened terminal windows." -ForegroundColor Yellow
