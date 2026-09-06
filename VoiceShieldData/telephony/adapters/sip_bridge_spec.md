# VoiceShield AI — Telephony Adapter Architecture Specification
## Reusable PBX / EPABX / SBC Media Ingestion Layer

---

### 1. Architectural Philosophy
VoiceShield AI is designed as a **reusable security intelligence layer**, not a replacement PBX. It operates in parallel with existing enterprise telecommunications infrastructure, receiving either forked real-time RTP audio or post-dial media streams without introducing single-point-of-failure call drops.

```
       PSTN / Carrier / Mobile Network
                     │
                     ▼
          Session Border Controller (SBC)
           (Audiocodes / Ribbon / Cisco)
                     │
         ┌───────────┴───────────┐
         │ (SIP Signaling)       │ (SIPREC Media Forking)
         ▼                       ▼
   Enterprise PBX         VoiceShield Adapter
 (Asterisk/Cisco/Avaya)   (RTP/SRTP Ingestion)
         │                       │
         ▼                       ▼
    Agent / Phone        VoiceShield Core Engine
```

---

### 2. Supported Telephony Integration Modes

#### Mode A: SIPREC (SIP Recording Protocol - RFC 7866) [Recommended Enterprise Standard]
- **Target Systems**: Cisco CUBE, AudioCodes Mediant SBC, Ribbon SBC, Oracle Acme Packet, Genesys Cloud.
- **Protocol**: SIP signaling over TLS (Port 5061), RTP/SRTP media over UDP.
- **Mechanism**: The SBC actively duplicates (forks) the bidirectional RTP stream of designated incoming calls to VoiceShield's SIPREC endpoint.
- **Failure Behavior**: If VoiceShield becomes unreachable, the SBC terminates the recording session without dropping the primary customer call (fail-open mode).
- **Latency**: Negligible (<10ms network duplication overhead).

#### Mode B: Asterisk / FreePBX AudioSocket Adapter
- **Target Systems**: Asterisk PBX 16+, FreePBX, Vicidial.
- **Protocol**: AudioSocket (TCP/Unix Domain Socket, bidirectional 16-bit 8kHz/16kHz linear PCM).
- **Dialplan Example**:
  ```ini
  [voiceshield-guard]
  exten => _X.,1,NoOp(Starting VoiceShield Security Guard)
  same => n,Set(VS_CALL_ID=${UNIQUEID})
  same => n,AudioSocket(voiceshield.internal:9092,${VS_CALL_ID})
  same => n,Dial(SIP/operator-queue)
  ```
- **Mechanism**: Asterisk opens a lightweight TCP socket to VoiceShield during call ring/setup, continuously streaming audio frames.

#### Mode C: WebRTC Call Intercept Gateway
- **Target Systems**: In-browser softphones, CRM click-to-call interfaces (Twilio Client, Amazon Connect, Zendesk Talk).
- **Protocol**: WebRTC DataChannels + WebSocket streaming (`ws://localhost:4000/ws`).
- **Mechanism**: JavaScript SDK taps `MediaStream` from the browser agent window and feeds 16kHz PCM chunks directly into VoiceShield Gateway.

---

### 3. Audio & Metadata Ingestion Pipeline

```
          Forked RTP / PCM Stream
                     │
                     ▼
             G.711 / G.722 Decoder
                     │
                     ▼
           16kHz Mono Resampler
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   Acoustic Forensics      Streaming ASR
  (LFCC/Prosody/RawNet)   (Token Generator)
         │                       │
         └───────────┬───────────┘
                     ▼
          Risk Arbitration Engine
                     │
                     ▼
            Call Guard Alert / WS
```

- **Inbound Codecs**: G.711u (PCMU), G.711a (PCMA), G.722, G.729, Opus.
- **Internal Normalization**: 16,000 Hz, 16-bit Signed Linear PCM, Mono.
- **Associated Metadata**: Caller ID, Callee ID, Trunk UUID, Direction, Encryption Flag (SRTP), Timestamp.

---

### 4. Enterprise Compatibility Matrix

| Vendor / Platform | Integration Type | Readiness Status | Operational Notes |
| :--- | :--- | :--- | :--- |
| **Asterisk (16+)** | AudioSocket / Chan_SIP | **SUPPORTED** | Tested via TCP AudioSocket adapter |
| **FreePBX** | Dialplan AudioSocket Module | **SUPPORTED** | Easy GUI dialplan injection |
| **Cisco Unified CM / CUBE** | SIPREC (RFC 7866) | **REQUIRES VALIDATION** | Standard RFC 7866 interoperability |
| **AudioCodes SBC** | SIPREC Forking | **REQUIRES VALIDATION** | Standard SIPREC XML metadata |
| **3CX Phone System** | Call Flow Designer / WebRTC | **PLANNED** | Integration via CRM Webhook & WebRTC |
| **Genesys Cloud** | AudioHook WebSocket API | **PLANNED** | Streaming bidirectional JSON/PCM |
| **Avaya Aura** | DMCC (Device & Media Control) | **PLANNED** | Enterprise CTI media capture |

> [!NOTE]
> VoiceShield does **not** claim universal compatibility across all proprietary PBX hardware without formal partner validation.
