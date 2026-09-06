# VoiceShield AI — Target Enterprise & Telephony Architecture

**Date:** September 4, 2026  
**Document Status:** Architecture Target Specification (Pre-Implementation)  
**Maturity Classification:**  
- `[CURRENT]`: Existing, verified, and functioning in repository.  
- `[PROPOSED]`: Designed for upcoming implementation phase with user approval.  
- `[FUTURE]`: Strategic long-term enterprise / government roadmap.  

---

## 1. End-to-End Enterprise System Topology

```
                         PSTN / Mobile Carrier / SIP Trunk
                                        │
                                        ▼
                     Enterprise EPABX / PBX Infrastructure
                       (Cisco CUCM / Avaya / Asterisk) [FUTURE]
                                        │
                                        ▼
                          Session Border Controller (SBC)
                     (AudioCodes / Ribbon / Cisco CUBE) [FUTURE]
                                        │
                       ┌────────────────┴────────────────┐
                       │                                 │
                       ▼ Primary Call                    ▼ Passive Media Fork
                 Normal Call Flow             VoiceShield Telephony Connector
                (Zero Added Latency)           (SIPREC / WebSocket Adapter)
                                                         │ [PROPOSED]
                                                         ▼
                                              Audio Normalization Pipeline
                                              (G.711 -> 16kHz PCM Buffer)
                                                         │ [CURRENT/STREAMING]
                                 ┌───────────────────────┴───────────────────────┐
                                 │                                               │
                                 ▼                                               ▼
                     Multi-Model Voice ML Tier                     Conversation AI / Fraud Copilot
                  (PyTorch 6-Model Ensemble)                       (Intent, Urgency, Scam Grammars)
                  • LCNN LFCC Spectral [CURRENT]                   • Social Engineering Intent [CURRENT]
                  • RawNet2 Waveform [CURRENT]                     • Wire Transfer Detection [CURRENT]
                  • BiLSTM Prosody [CURRENT]                       • Multilingual NLP [FUTURE]
                  • WavLM Contextual [CURRENT]                                   │
                  • ECAPA-TDNN Biometric [CURRENT]                               │
                                 │                                               │
                                 ▼                                               ▼
                     Acoustic Authenticity Score                       Fraud Indicator Signals
                     (0.0 - 100.0 Calibrated) [CURRENT]                (Extracted Threat Flags) [CURRENT]
                                 │                                               │
                                 └───────────────────────┬───────────────────────┘
                                                         │
                                                         ▼
                                            Consensus & Stacking Risk Engine
                                             (Logistic Stacker + Calibration)
                                             [CURRENT: calibration.json]
                                                         │
                                 ┌───────────────────────┼───────────────────────┐
                                 │                       │                       │
                                 ▼                       ▼                       ▼
                         Real-Time Alert          Forensic Investigation       Evidence Vault
                         • SOC Banner [CURRENT]   • Dossier Case [CURRENT]     • SHA-256 Hash [CURRENT]
                         • Agent Screen-Pop       • Telemetry Unmask [CURRENT] • Chain of Custody [CURRENT]
                           [PROPOSED]             • Legal Escalation           • Server X.509 Sign
                         • SIP Drop Webhook         [CURRENT]                    [FUTURE]
                           [PROPOSED]                                            │
                                 │                                               │
                                 └───────────────────────┬───────────────────────┘
                                                         │
                                                         ▼
                                            Threat Intelligence Engine
                                            • Fraud Campaign Graph [CURRENT]
                                            • Cross-Incident Correlation [CURRENT]
                                            • Carrier / IP Blacklisting [PROPOSED]
                                                         │
                                                         ▼
                                             Security Operations Console
                                            (React 18 + Vite 5 Light Dashboard)
                                            • Live Call Stream [CURRENT]
                                            • Interactive 3D Acoustics [CURRENT]
                                            • Geospatial Threat Map [CURRENT]
```

---

## 2. Component Maturity Classification

### 1. Ingestion & Telephony
* `[CURRENT]`: Browser microphone audio recording via HTML5 Web Audio API; batch audio file upload (`.wav`, `.mp3`, `.m4a`, `.flac`); WebSocket PCM chunk streaming (`/api/v1/stream/socket`).
* `[PROPOSED]`: Dedicated Node.js / Go `VoiceShield Telephony Connector` accepting audio forking from Asterisk, FreeSWITCH, or Twilio WebSocket streams with zero impact on primary call latency.
* `[FUTURE]`: Certified carrier-grade SIPREC listener (RFC 7865) interfacing directly with hardware Session Border Controllers (AudioCodes Mediant, Ribbon SBC 5000, Cisco CUBE).

### 2. Machine Learning & Biometrics
* `[CURRENT]`: 6-Model Neural Ensemble (LCNN + LFCC, RawNet2, AASIST, WavLM, BiLSTM Prosody, ECAPA-TDNN); Stacking Logistic Regression with Isotonic/Platt calibration (Brier Score `0.1312`); sliding window inference (3.0s window, 1.5s hop); dual-speed streaming (Fast-Path LCNN + Slow-Path Consensus).
* `[PROPOSED]`: Quantized INT8 ONNX exports for sub-10ms edge CPU execution; multi-class classification head (`BONA_FIDE`, `NEURAL_TTS`, `ZERO_SHOT_CLONE`, `REPLAY`).
* `[FUTURE]`: Self-supervised acoustic foundation model with fine-tuning on regional telecom codecs and over-the-air acoustic injection.

### 3. Fraud Copilot & Conversation Analysis
* `[CURRENT]`: Rule-based lexical intent parser (`voice_shield/copilot.py`) detecting urgency, financial demands, arrest threats, and impersonation.
* `[PROPOSED]`: Integration with lightweight on-premise ASR (Whisper.cpp / Vosk) generating live transcription without cloud data transmission.
* `[FUTURE]`: Multi-lingual conversational LLM analyzing dialectal nuance, psychological manipulation tactics, and real-time counter-interrogation suggestions.

### 4. Investigation & Evidence Management
* `[CURRENT]`: Case dossiers (`investigation_cases`), SHA-256 evidence hashing, legal authorization workflow (`AuthorizedInvestigationProvider`), client-side PDF export (`jsPDF`), campaign clustering.
* `[PROPOSED]`: Automated server-side PDF evidence generation with tamper-evident cryptographic hash watermarking.
* `[FUTURE]`: ISO/IEC 27037 compliant digital evidence package signed with HSM-backed X.509 certificates and RFC 3161 cryptographic timestamping.

### 5. Security & Operations Console (UI/UX)
* `[CURRENT]`: 28 responsive React routes; clean modern light design system; Three.js 3D acoustic embedding visualizer; dynamic risk gauge; interactive Leaflet threat map.
* `[PROPOSED]`: Real-time active call row audio streaming visualizer; SIP trunk status health monitoring card; dark-card-free enterprise accessibility.
* `[FUTURE]`: Multi-monitor SOC wall layout with air-gapped offline vector mapping.
