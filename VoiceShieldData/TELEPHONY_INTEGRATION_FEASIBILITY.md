# Telephony & EPABX Integration Feasibility Audit

**Date:** September 4, 2026  
**Project:** VoiceShield AI Voice Security Platform  
**Target Domain:** Enterprise PBX / EPABX, Telecom Carriers, Call Centers & Government SOCs  

---

## 1. Executive Summary & Recommended Integration Point

VoiceShield AI currently consumes audio either as batch audio files (via multipart HTTP) or as Base64-encoded PCM float32 buffers over WebSocket (`/api/v1/stream/socket`).

To integrate VoiceShield AI into live telecommunications infrastructure (Cisco Unified Communications Manager, Avaya Aura, Asterisk, FreeSWITCH, Genesys, AudioCodes SBC, Ribbon SBC) without degrading call latency or violating carrier PSTN reliability standards, **the recommended architectural pattern is Asynchronous Out-of-Band Call Media Forking via SIPREC or an SBC Media Proxy Adapter.**

### Recommended Pattern: SIPREC / Media Forking
```
    Carrier / PSTN / SIP Trunk
                │
                ▼
    Enterprise SBC / EPABX / PBX
       (Session Border Controller)
         │                       │
         │ Primary In-Band       │ Passive Forged Media
         │ Audio Path (RTP)      │ (SIPREC / RTP Fork)
         ▼                       ▼
   Call Agent / Phone      VoiceShield Telephony Connector
   (Zero Latency Impact)         │
                                 ▼
                           Media Transcoder
                           (G.711 / Opus -> 16kHz PCM)
                                 │
                                 ▼
                     VoiceShield ML Streaming Engine
                                 │
                                 ▼
                    Real-Time Fraud & AI Risk Engine
                                 │
                         ┌───────┴───────┐
                         ▼               ▼
                 SOC Live Alert     Agent Screen-Pop /
                 & Investigation    Automated SIP Drop Webhook
```

---

## 2. Ingest Specifications & Data Flow

### A. Data Entering VoiceShield
1. **Raw Media Streams:**
   - Dual-channel (Stereo) RTP audio: Channel 0 (Inbound Caller / Suspect), Channel 1 (Outbound Agent / Protected Party).
   - Standard Telecom Codecs: G.711u (PCMU), G.711a (PCMA), G.722, G.729, or Opus.
2. **Signaling & Call Telemetry:**
   - SIP Headers: `Call-ID`, `From` (Caller ID / ANI), `To` (Dialed Number / DNIS), `Contact`, `User-Agent`, `Via` (hop path), `P-Asserted-Identity`, `Diversion` (forwarding history).
   - EPABX Trunk Metadata: Extension ID, Hunt Group, Queue Duration, Transfer Events.

### B. Audio & Media Flow
1. SBC or EPABX initiates a SIPREC session (`INVITE` with SDP containing `application/rs-metadata+xml`).
2. VoiceShield Telephony Connector accepts the session, establishing an RTP listener socket.
3. Media Transcoder extracts the Inbound Caller channel, decodes the 8kHz G.711 bitstream, and applies polyphase upsampling to **16 kHz 32-bit float mono PCM**.
4. The standardized stream is chunked into 1.5-second contiguous blocks (48,000 bytes at 16kHz) with 0.5s overlap and piped directly into `StreamingDetectionEngine`.

### C. Real-Time ML & Inference Flow
- **Fast-Path (<40 ms):** The LCNN spectral detector scores every incoming 1.5s chunk immediately, extracting Linear Frequency Cepstral Coefficients (LFCCs) to spot synthetic vocoder artifacts.
- **Slow-Path (<180 ms, every 5 chunks):** A continuous 3.0s rolling buffer is evaluated across the full model ensemble (LCNN + BiLSTM Prosody + RawNet2 + WavLM).
- **Fraud Copilot Flow:** When an automatic speech recognition (ASR) transcript stream is available, conversation text is concurrently evaluated against urgent social-engineering scam grammars (`voice_shield/copilot.py`).

### D. Risk Result & Action Flow
- Risk score calculated on a calibrated $0-100$ scale.
- If **Risk < 35 (BONA FIDE):** Stream telemetry logs green in `/calls`.
- If **Risk 35 - 65 (UNCERTAIN):** Visual warning banner flagged to supervisor dashboard; second-pass acoustic analysis engaged.
- If **Risk > 65 (SUSPECTED SPOOF / VOICE CLONE):**
  1. Instant WebSocket broadcast to SOC dashboard (`/dashboard`) and active agent console.
  2. Telephony Connector triggers an automated SIP Call Action webhook (e.g., SIP `BYE`, transfer to fraud queue, or forced biometric challenge).
  3. Automatic creation of a legal evidence dossier in `investigation_cases` with SHA-256 audio checksum and network metadata.

---

## 3. Protocol & Architecture Feasibility Matrix

| Protocol / Architecture | Feasibility | Latency Profile | Integration Complexity | Implementation Mechanism |
|---|---|---|---|---|
| **SIPREC (RFC 7865 / 7866)** | **HIGH (Recommended)** | 30 - 80 ms | Moderate | Native SBC feature (AudioCodes, Ribbon, Cisco CUBE, Oracle Enterprise SBC). Passive out-of-band recording fork. |
| **RTP Direct Stream / Raw UDP** | **HIGH** | 10 - 30 ms | High | Requires RTP port pool manager (e.g. `rtpengine`, `GStreamer`, or `Janus Gateway`) terminating RTP and converting to PCM. |
| **WebRTC Gateway** | **HIGH** | 15 - 50 ms | Low | Directly compatible with existing browser Web Audio stack. Ideal for web-based contact centers (Amazon Connect, Genesys Cloud, Twilio Flex). |
| **Asterisk PBX (ARI / AMI / AudioFork)** | **VERY HIGH** | 20 - 60 ms | Low | Asterisk `ExternalMedia` or `AudioFork` module sends live PCM directly to VoiceShield WebSocket. |
| **FreeSWITCH (mod_audio_fork)** | **VERY HIGH** | 15 - 45 ms | Low | `mod_audio_fork` mirrors channel audio via bidirectional WebSocket directly to VoiceShield ML port. |
| **In-Line SIP Proxy (B2BUA)** | **LOW / RISKY** | 80 - 250 ms | Very High | **NOT RECOMMENDED.** Inserting VoiceShield as an active inline audio bridge introduces jitter buffer risks and potential call drops during failover. |

---

## 4. Vendor Dependency & Boundaries

### What MUST Remain OUTSIDE VoiceShield Core:
1. **Carrier Interconnects & PSTN T1/E1 PRIs:** VoiceShield must never act as a telecom switch or trunk termination carrier.
2. **Physical IP-PBX Hardware:** Cisco CUCM, Avaya Aura, Mitel, and Panasonic hardware management remains on customer premises.
3. **Session Border Controller (SBC):** SBC security (TLS/SRTP decryption, NAT traversal, firewalling) must be handled by certified SBC appliances (AudioCodes, Ribbon, Cisco CUBE).

### What VoiceShield Provides via Adapters:
1. **VoiceShield Telephony Connector (Microservice):** Lightweight adapter accepting SIPREC or WebSocket audio forks, performing G.711/G.722 to 16kHz PCM standardization, and feeding `/api/v1/stream/socket`.
2. **Telephony Policy Webhook Engine:** REST/Webhook handler emitting standardized policy decisions (`ALLOW`, `WARN_AGENT`, `DROP_CALL`, `DIVERT_TO_HONEYPOT`) back to the PBX/SBC routing engine.
3. **Investigation Vault:** Automatic capture of `SIP-Call-ID`, carrier hops, and cryptographic recording hashes.

---

## 5. Non-Functional Telephony Requirements

* **Latency Budget:** Total round-trip decision latency from audio ingestion to risk alert must remain strictly under **500 ms** to enable proactive call intervention.
* **Jitter & Packet Loss Handling:** Telecom audio over UDP may suffer 1–5% packet loss. Telephony Connector must employ packet loss concealment (PLC) and constant-rate ring buffers before feeding PyTorch feature extractors.
* **Security & SRTP:** Media forks must support TLS for SIP signaling and SRTP (AES-128 / AES-256) for audio payloads.
* **High Availability (HA):** Active-passive or active-active connector instances with zero-downtime failover to prevent call loss.
