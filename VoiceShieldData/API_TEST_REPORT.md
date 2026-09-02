# VoiceShield API Gateway & ML Service Test Report

**Date:** 2026-08-30  
**Test Suites:** `pytest tests/` (Python ML & FastAPI) & `vitest` (Node.js Express Gateway)  

---

## 1. Test Summary

| Test Suite | Total Tests | Passed | Failed | Skipped | Status |
|------------|-------------|--------|--------|---------|--------|
| **Python Pytest (ML, VAD, Features, APIs)** | 45 | **45** | 0 | 0 | **100% PASSED** |
| **Node.js Express Gateway (Vitest)** | 15 | **15** | 0 | 0 | **100% PASSED** |
| **Total Automated Tests** | **60** | **60** | **0** | **0** | **100% PASSED** |

---

## 2. Tested Endpoints & Results

### 2.1 Authentication Endpoints (`/api/v1/auth`)
* `POST /api/v1/auth/signup`: Created test user with hashed password (bcrypt/argon2) and issued JWT access & refresh tokens. [PASS]
* `POST /api/v1/auth/signup` (Duplicate Email): Returns HTTP 409 `USER_EXISTS`. [PASS]
* `POST /api/v1/auth/signin`: Validates credentials and returns fresh session tokens. [PASS]
* `POST /api/v1/auth/signin` (Invalid Password): Returns HTTP 401 Unauthorized. [PASS]
* `GET /api/v1/auth/me`: Returns authenticated user profile using Bearer JWT. [PASS]

### 2.2 Audio Upload & Detection Endpoints (`/api/v1/detection`)
* `POST /api/v1/detection/validate`: Preflight audio validation for WAV, FLAC, MP3, OGG, M4A, WEBM, and AAC. [PASS]
* `POST /api/v1/detection` (Empty File): Returns structured error `{ "success": false, "error": { "code": "EMPTY_FILE" } }`. [PASS]
* `POST /api/v1/detection` (Valid WAV & WebM): Asynchronously enqueues job or synchronously evaluates audio with sliding-window multi-model inference. [PASS]
* `GET /api/v1/detection/:id`: Retrieves detection status and completed results. [PASS]
* `GET /api/v1/detection/model/info`: Returns model architectures, sub-model weights, parameter counts, and version string. [PASS]

### 2.3 Scam Reports & Threat Intelligence (`/api/v1/reports` & `/api/v1/location`)
* `POST /api/v1/reports`: Records user scam reports with category, description, anonymized phone number, and rounded coordinates. [PASS]
* `GET /api/v1/reports`: Retrieves report feed with phone numbers masked (`+91-98****1234`). [PASS]
* `GET /api/v1/location/threats`: Aggregates active incident clusters for OpenStreetMap rendering. [PASS]

### 2.4 History, Statistics & Admin Endpoints
* `GET /api/v1/history`: Returns paginated detection history for authenticated users. [PASS]
* `GET /api/v1/statistics`: Returns real database counts for total analyses, authentic samples, and detected threats. [PASS]
* `GET /api/v1/admin/overview`: Protected route; enforces 403 Forbidden for non-admin accounts. [PASS]

### 2.5 Observability & Health Probes (`/health`, `/ready`, `/live`, `/api/v1/health`)
* `GET /health` & `GET /api/v1/health`: Returns HTTP 200 with service version, ML status, decoder availability, and queue depth. [PASS]
