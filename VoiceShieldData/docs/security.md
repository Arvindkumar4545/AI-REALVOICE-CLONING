# VoiceShield Security & Privacy Policies

## 1. Authentication & Session Security
- **Password Hashing**: Bcrypt with minimum 10 work rounds. Plaintext passwords are never logged or stored.
- **JWT Architecture**: Short-lived Access Tokens (15m) paired with rotating Refresh Tokens (7d).
- **Brute-Force Protection**: Account lockout and exponential backoff on repeated authentication failures.

---

## 2. Audio File Handling & Ingestion Security
- **Format Validation**: Strict magic byte inspection on incoming payloads to prevent executable injection disguised as audio.
- **Max Upload Threshold**: Enforced 50MB ceiling across gateway and ML service.
- **Memory-Bound Buffering**: Audio streams are processed via temporary in-memory buffers and wiped after inference completion. Raw audio is never permanently persisted without explicit user opt-in.

---

## 3. Location Policy & Ethical AI Transparency
- **Explicit Consent**: Geolocation is only captured when the user explicitly enables regional threat telemetry.
- **Coarse Granularity Only**: Only coarse city/regional coordinates are stored; precise GPS or device metadata is strictly discarded.
- **Non-Criminalization Disclaimer**: A high-risk spoof detection score indicates synthetic audio artifacts and does **NOT** constitute definitive proof of criminal activity.
