# VoiceShield Real-Time Streaming Implementation Guide

## Overview

This document describes the complete real-time streaming audio detection system for VoiceShield. The system enables continuous analysis of audio while the user is speaking, with instant risk scoring (fast-path via LCNN) and high-confidence verdicts (slow-path via 6-model consensus).

## Architecture

### End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER (Client)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. useAudioWorklet Hook                                         │
│     ├─ Captures 16kHz mono audio via AudioWorkletNode            │
│     ├─ Produces 1.5s chunks with 50% overlap (750ms hop)         │
│     ├─ Ring buffer (12-15s capacity) for backpressure handling   │
│     └─ Emits: AudioChunk { seq, timestamp, sampleRate, pcmData } │
│                                                                   │
│  2. useStreamingDetection Hook                                   │
│     ├─ POST /api/v1/stream/session → Creates session, get ID     │
│     ├─ WebSocket /api/v1/stream/socket → Bidirectional connect   │
│     ├─ Sends audio chunks as JSON + base64 binary                │
│     ├─ Receives: chunk_score (fast), consensus_update (slow)     │
│     └─ Buffers chunks if connection stalls (auto-reconnect)      │
│                                                                   │
│  3. UI Components                                                │
│     ├─ LiveAnalysisPanel: Recording status, elapsed time, buttons│
│     ├─ LiveShield3D: Animated 3D blob (GREEN→ORANGE→RED)         │
│     ├─ RiskTimeline: Recharts graph (fast + slow traces)         │
│     ├─ ExplainableAiCard: Model signals & breakdown (real-time)  │
│     └─ [Optional] ForensicRadar, SessionTranscript panels        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ WebSocket
                    ┌─────────────────────┐
                    │  ML Service (Backend)│
                    │  FastAPI @ port 8000│
                    └─────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               Streaming Detection Engine (Server)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. StreamingSession (per client)                                │
│     ├─ Audio buffer: deque(maxlen=240000) ← 15s @ 16kHz          │
│     ├─ Chunk count: Increments per message received              │
│     ├─ Score timeline: Array of { ts_ms, type, riskScore, ... }  │
│     └─ Flagged segments: High-risk windows detected              │
│                                                                   │
│  2. Fast-Path (LCNN Only) - Per Chunk (~50-100ms)                │
│     ├─ Input: Current PCM chunk (1.5s at 16kHz = 24k samples)    │
│     ├─ Run LCNN inference (smallest model, ~245k params)         │
│     ├─ Output: riskScore (spoof probability 0-1)                 │
│     └─ Send: {"type": "chunk_score", "seq", "riskScore", ...}    │
│                                                                   │
│  3. Slow-Path (6-Model Consensus) - Every 5 Chunks (~7.5s)       │
│     ├─ Input: Accumulated buffer (10-15s audio window)           │
│     ├─ Run all 6 models: LCNN, RawNet2, AASIST, WavLM, BiLSTM,   │
│     │                    ECAPA in parallel                       │
│     ├─ Ensemble fusion: Weighted votes → riskScore + classification
│     │   - BONA_FIDE: risk < 0.35 (genuine human speech)          │
│     │   - UNCERTAIN: 0.35 ≤ risk ≤ 0.65 (ambiguous)             │
│     │   - SPOOF: risk > 0.65 (detected deepfake/synthetic)       │
│     ├─ Generate explanation: Signals, model agreement, etc.      │
│     └─ Send: {"type": "consensus_update", ...}                   │
│                                                                   │
│  4. Session Finalization                                         │
│     ├─ Triggered by: Client sends end_session or disconnects     │
│     ├─ Compute: Max risk, avg risk, flagged segments             │
│     ├─ Generate final verdict: Based on consensus updates        │
│     └─ Send: {"type": "session_ended", "finalVerdict", ...}      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │   PyTorch Models    │
                    │  (6 sub-models)     │
                    └─────────────────────┘
```

## Backend Implementation

### 1. Streaming Engine (`ml-service/app/streaming.py`)

#### StreamingSession Class
Manages state for a single streaming session:

```python
class StreamingSession:
    def __init__(self, session_id: str, model_manager: ModelManager):
        self.session_id = session_id
        self.audio_buffer = deque(maxlen=BUFFER_SIZE_SAMPLES)  # 15s
        self.chunk_count = 0
        self.score_timeline = []
        self.flagged_segments = []
        self.start_time = time.time()
    
    def add_chunk(self, pcm_data: np.ndarray) -> None:
        """Add PCM chunk to rolling buffer."""
        self.audio_buffer.extend(pcm_data.flatten())
        self.chunk_count += 1
    
    def get_buffer_as_tensor(self) -> torch.Tensor:
        """Get current buffer as PyTorch tensor."""
        audio_np = np.array(list(self.audio_buffer), dtype=np.float32)
        return torch.from_numpy(audio_np)
    
    def record_score(self, score_type: str, risk_score: float, 
                    model_breakdown: Dict, explanation: List) -> Dict:
        """Record score with timestamp and explanation."""
        record = {
            "ts_ms": int(self.elapsed_seconds() * 1000),
            "type": score_type,  # "fast" or "slow"
            "risk_score": round(risk_score, 4),
            "model_breakdown": model_breakdown,
            "explanation": explanation,
        }
        self.score_timeline.append(record)
        # Auto-flag if risk > 0.70
        return record
    
    def finalize(self) -> Dict:
        """Generate final session verdict."""
        risk_scores = [s["risk_score"] for s in self.score_timeline if s["type"] == "slow"]
        max_risk = max(risk_scores) if risk_scores else 0.0
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0
        
        # Determine classification
        if max_risk > 0.70:
            final_verdict = "SPOOF"
        elif max_risk > 0.35:
            final_verdict = "UNCERTAIN"
        else:
            final_verdict = "BONA_FIDE"
        
        return {
            "sessionId": self.session_id,
            "finalVerdict": final_verdict,
            "durationMs": int(self.elapsed_seconds() * 1000),
            "scoreTimeline": self.score_timeline,
            "summary": {
                "maxRiskScore": round(max_risk, 4),
                "avgRiskScore": round(avg_risk, 4),
                "flaggedSegments": self.flagged_segments
            }
        }
```

#### StreamingDetectionEngine Class
Manages multiple concurrent sessions:

```python
class StreamingDetectionEngine:
    def __init__(self, model_manager: ModelManager):
        self.model_manager = model_manager
        self.sessions: Dict[str, StreamingSession] = {}
    
    async def run_fast_path(self, session: StreamingSession, 
                           pcm_chunk: np.ndarray) -> Dict:
        """Fast-path: LCNN only (~50-100ms)."""
        # Run LCNN inference on chunk
        chunk_tensor = torch.from_numpy(pcm_chunk.astype(np.float32))
        with torch.no_grad():
            lcnn_logit = self.model_manager.lcnn(chunk_tensor, return_logits=True)
            lcnn_spoof_prob = float(1.0 - torch.sigmoid(lcnn_logit)[0].item())
        
        return {
            "type": "chunk_score",
            "seq": session.chunk_count,
            "riskScore": round(lcnn_spoof_prob, 4),
            "confidence": 0.6,
            "latencyMs": round(latency_ms, 2)
        }
    
    async def run_slow_path(self, session: StreamingSession) -> Dict:
        """Slow-path: Full consensus (~300ms every 5 chunks)."""
        # Run full inference pipeline on buffer
        result = self.model_manager.predict(session.get_buffer_as_tensor().numpy())
        
        session.record_score(
            "slow",
            result["spoof_probability"],
            model_breakdown=result["model_scores"],
            explanation=result["explanation"],
            latency_ms=latency_ms
        )
        
        return {
            "type": "consensus_update",
            "seq": session.chunk_count,
            "riskScore": round(result["spoof_probability"], 4),
            "classification": result["classification"],  # BONA_FIDE|UNCERTAIN|SPOOF
            "modelBreakdown": {k: round(v, 4) for k, v in result["model_scores"].items()},
            "explanation": result["explanation"],
            "latencyMs": round(latency_ms, 2)
        }
```

### 2. WebSocket Endpoints (`ml-service/app/main.py`)

#### Session Creation Endpoint
```python
@app.post("/api/v1/stream/session")
async def stream_session_create(x_request_id: Optional[str] = Header(None)):
    """Create session, return sessionId and WebSocket URL."""
    session_id = str(uuid.uuid4())
    engine = get_streaming_engine()
    session = engine.create_session(session_id)
    
    return {
        "sessionId": session_id,
        "wsUrl": f"ws://localhost:8000/api/v1/stream/socket?sessionId={session_id}",
        "createdAt": int(time.time() * 1000),
    }
```

#### WebSocket Handler
```python
@app.websocket("/api/v1/stream/socket")
async def websocket_stream_endpoint(websocket: WebSocket, sessionId: str):
    """Bidirectional audio streaming and scoring."""
    engine = get_streaming_engine()
    session = engine.get_session(sessionId)
    
    if session is None:
        await websocket.close(code=4000, reason="Invalid sessionId")
        return
    
    await websocket.accept()
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "audio_chunk":
                # Decode base64 PCM
                pcm_base64 = msg["pcmDataBase64"]
                pcm_bytes = base64.b64decode(pcm_base64)
                pcm_array = np.frombuffer(pcm_bytes, dtype=np.float32)
                
                # Add to buffer
                session.add_chunk(pcm_array)
                
                # Fast-path: Every chunk
                fast_result = await engine.run_fast_path(session, pcm_array)
                await websocket.send_json(fast_result)
                
                # Slow-path: Every 5 chunks
                if session.chunk_count % SLOW_PATH_INTERVAL_CHUNKS == 0:
                    slow_result = await engine.run_slow_path(session)
                    await websocket.send_json(slow_result)
            
            elif msg.get("type") == "end_session":
                break
    
    finally:
        # Finalize and send verdict
        final = session.finalize()
        try:
            await websocket.send_json({"type": "session_ended", **final})
        except:
            pass
        
        engine.close_session(sessionId)
```

## Frontend Implementation

### 1. useAudioWorklet Hook (`frontend/src/hooks/useAudioWorklet.ts`)

Captures 16kHz PCM audio via AudioWorkletNode with 50% overlap windowing:

```typescript
const { 
  isRecording, 
  isInitialized, 
  error,
  startRecording,
  stopRecording 
} = useAudioWorklet(
  (chunk: AudioChunk) => {
    // Callback: chunk ready
    // chunk = { seq, timestamp, sampleRate, durationMs, pcmData }
    console.log(`Chunk ${chunk.seq}: ${chunk.durationMs}ms at ${chunk.sampleRate}Hz`);
  },
  (error) => {
    // Error callback
    console.error('AudioWorklet error:', error);
  }
);

// Usage:
<button onClick={startRecording}>Start</button>
<button onClick={stopRecording}>Stop</button>
```

**Key Features:**
- 1.5s windows (24k samples @ 16kHz) with 750ms overlap (50%)
- Automatic resampling if input != 16kHz
- Ring buffer to handle backpressure
- Separate thread via AudioWorklet (no main thread blocking)

### 2. useStreamingDetection Hook (`frontend/src/hooks/useStreamingDetection.ts`)

Manages WebSocket lifecycle and message handling:

```typescript
const {
  isConnected,
  isStreaming,
  sessionId,
  lastChunkScore,
  lastConsensus,
  scoreTimeline,
  finalVerdict,
  error,
  chunksSent,
  latencyMs,
  startSession,
  sendAudioChunk,
  endSession
} = useStreamingDetection(
  (chunkScore) => console.log('Fast score:', chunkScore),
  (consensus) => console.log('Consensus:', consensus),
  (verdict) => console.log('Final verdict:', verdict),
  (error) => console.error('Streaming error:', error)
);

// Integration with AudioWorklet:
useAudioWorklet(
  (chunk) => sendAudioChunk(chunk),  // Forward chunks to WebSocket
  (err) => console.error(err)
);

// Usage:
<button onClick={() => startSession().then(() => audioWorklet.startRecording())}>
  Start Live Analysis
</button>

<button onClick={() => {
  audioWorklet.stopRecording();
  endSession();
}}>
  Stop Recording
</button>
```

**Key Features:**
- Auto-reconnect (5 attempts, 2s delay)
- Chunk buffering during network stalls
- Keep-alive pings (30s interval)
- Type-safe message handling

### 3. UI Components

#### LiveAnalysisPanel
Displays recording status, elapsed time, and controls:
```tsx
<LiveAnalysisPanel
  isRecording={audioWorklet.isRecording}
  isConnected={streamingDetection.isConnected}
  elapsedSeconds={elapsed}
  riskScore={streamingDetection.lastConsensus?.riskScore ?? 0}
  classification={streamingDetection.lastConsensus?.classification}
  chunksSent={streamingDetection.chunksSent}
  latencyMs={streamingDetection.latencyMs}
  onStart={handleStart}
  onStop={handleStop}
/>
```

#### RiskTimeline
Recharts-based time-series visualization:
```tsx
<RiskTimeline
  chunkScores={streamingDetection.scoreTimeline.filter(s => 'confidence' in s)}
  consensusUpdates={streamingDetection.scoreTimeline.filter(s => 'classification' in s)}
  maxDataPoints={50}
/>
```

Shows:
- Blue thin line: Fast-path LCNN scores (per chunk, frequent)
- Red thick line: Slow-path consensus (every 5 chunks, less frequent)
- Background zones: Green (<35%), Amber (35-65%), Red (>65%)

#### LiveShield3D
Three.js animated 3D blob:
```tsx
<LiveShield3D
  riskScore={streamingDetection.lastConsensus?.riskScore ?? 0}
  isAnimating={audioWorklet.isRecording}
  size={300}
/>
```

Features:
- Color animation: GREEN (low risk) → ORANGE → RED (high risk)
- Pulse intensity proportional to risk score
- Rotation and scale animation
- Emissive glow effect

### 4. Integration Example (`frontend/src/pages/StreamingDetectionExample.tsx`)

Complete working example showing how to wire everything together:

```tsx
const audioWorklet = useAudioWorklet(
  (chunk) => streamingDetection.sendAudioChunk(chunk),
  (error) => setError(error)
);

const streamingDetection = useStreamingDetection(
  (score) => console.log('Chunk:', score),
  (consensus) => console.log('Consensus:', consensus),
  (verdict) => console.log('Verdict:', verdict),
  (error) => setError(error)
);

const handleStartRecording = async () => {
  sessionStartTimeRef.current = Date.now();
  await streamingDetection.startSession();
  await audioWorklet.startRecording();
};

const handleStopRecording = () => {
  audioWorklet.stopRecording();
  streamingDetection.endSession();
};

// Render:
return (
  <div>
    <LiveAnalysisPanel {...props} onStart={handleStartRecording} onStop={handleStopRecording} />
    <LiveShield3D riskScore={streamingDetection.lastConsensus?.riskScore ?? 0} {...props} />
    <RiskTimeline chunkScores={...} consensusUpdates={...} />
    <ExplainableAiCard explanation={streamingDetection.lastConsensus?.explanation} {...props} />
  </div>
);
```

## Message Protocol

### Client → Server

**Audio Chunk**
```json
{
  "type": "audio_chunk",
  "seq": 5,
  "sampleRate": 16000,
  "durationMs": 1500,
  "pcmDataBase64": "AAAAAAAAADQAP..." ,
  "timestamp": 1704067200000
}
```

**Session End**
```json
{
  "type": "end_session"
}
```

**Keep-Alive Ping**
```json
{
  "type": "ping"
}
```

### Server → Client

**Chunk Score (Fast-Path)**
```json
{
  "type": "chunk_score",
  "seq": 5,
  "riskScore": 0.2438,
  "confidence": 0.6,
  "latencyMs": 87.5
}
```

**Consensus Update (Slow-Path)**
```json
{
  "type": "consensus_update",
  "seq": 5,
  "riskScore": 0.3125,
  "classification": "BONA_FIDE",
  "modelBreakdown": {
    "lcnn_lfcc": 0.22,
    "rawnet2": 0.18,
    "aasist": 0.25,
    "wavlm": 0.19,
    "bilstm_prosody": 0.15,
    "ecapa_tdnn": 0.20,
    "model_agreement": 0.92
  },
  "explanation": [
    {
      "signal": "High LFCC uniformity (no synthesis artifacts)",
      "strength": 0.95,
      "explanation": "Consistent spectral distribution indicates natural speech"
    },
    {
      "signal": "Stable prosody (F0, jitter, shimmer within natural range)",
      "strength": 0.88,
      "explanation": "Acoustic features suggest genuine human speaker"
    }
  ],
  "latencyMs": 312.4
}
```

**Session Ended (Final Verdict)**
```json
{
  "type": "session_ended",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "finalVerdict": "BONA_FIDE",
  "durationMs": 45000,
  "scoreTimeline": [
    { "ts_ms": 1500, "type": "fast", "risk_score": 0.2438, "latency_ms": 87.5 },
    { "ts_ms": 7500, "type": "slow", "risk_score": 0.3125, ... },
    ...
  ],
  "summary": {
    "maxRiskScore": 0.3125,
    "avgRiskScore": 0.2841,
    "flaggedSegments": []
  }
}
```

**Error**
```json
{
  "type": "error",
  "message": "Model inference failed: out of memory"
}
```

**Keep-Alive Pong**
```json
{
  "type": "pong"
}
```

## Performance Characteristics

### Latency Budget
- **Fast-Path (LCNN):** ~50-100ms per chunk
- **Slow-Path (6-model consensus):** ~300ms (executed in parallel with fast-path)
- **Network RTT:** ~10-50ms (local dev) to ~100-200ms (production)
- **Total E2E latency for verdict:** ~300-400ms (blocking slow-path)

### Throughput
- **Audio chunk rate:** 1 chunk every 750ms (1.33 chunks/sec)
- **Fast-path message rate:** 1.33 msg/sec (continuous)
- **Slow-path message rate:** 0.27 msg/sec (every ~3.75s)
- **Bandwidth:** ~100KB/sec (base64-encoded PCM at 16kHz mono)

### Memory
- **Per-session buffer:** 15 seconds × 16kHz × 4 bytes/sample = ~960 KB
- **Score timeline:** ~1 KB per minute (assuming ~1 score/sec average)
- **Concurrent sessions:** Limited primarily by model inference parallelism (likely 2-4 on CPU)

## Deployment Considerations

### Environment Variables (Frontend)
```env
REACT_APP_ML_SERVICE_URL=localhost:8000          # Dev
REACT_APP_ML_SERVICE_URL=ml.voiceshield.io:8000  # Prod
```

### Environment Variables (Backend)
```env
VOICESHIELD_CHECKPOINT=models/improved_model.pt
VOICESHIELD_DEVICE=cuda  # or 'cpu'
VOICESHIELD_BUFFER_SIZE_SECONDS=15
```

### Docker / K8s
- ML service must expose port 8000 (WebSocket + HTTP)
- CORS headers must allow client domain
- Session timeout: Recommend closing after 5 minutes of inactivity
- Rate limiting: Recommend max 5-10 concurrent sessions per instance

### Browser Compatibility
- **Audio Capture:** Chrome 64+, Firefox 55+, Safari 14.1+, Edge 79+
- **AudioWorklet:** Chrome 66+, Firefox 76+, Safari 14.1+
- **WebSocket:** All modern browsers
- **Three.js:** WebGL required (all modern browsers)

## Testing

### Unit Tests
- `tests/test_streaming.py` - StreamingSession, StreamingDetectionEngine
- `frontend/src/hooks/__tests__/useAudioWorklet.test.ts`
- `frontend/src/hooks/__tests__/useStreamingDetection.test.ts`

### Integration Tests
- End-to-end with mock audio data
- WebSocket connection lifecycle (connect, disconnect, reconnect)
- Chunk buffering under network delay simulation
- Session finalization and verdict accuracy

### Manual Testing
1. Start backend: `uvicorn ml-service.app.main:app --reload`
2. Start frontend: `npm run dev`
3. Navigate to `/detect` → "Live Streaming" tab
4. Click "Start Recording" → Speak into microphone
5. Observe:
   - Connection status updates
   - Live 3D blob color changes (GREEN/ORANGE/RED)
   - Risk timeline chart updates
   - Chunk and consensus scores appear
   - Model explainability signals update
6. Click "Stop Recording" → See final verdict

## Troubleshooting

### AudioWorklet Module Not Found
**Error:** `Failed to load audio worklet module`
- Solution: Ensure `audioWorkletProcessor.js` is in `public/` folder and accessible at `/audioWorkletProcessor.js`

### WebSocket Connection Refused
**Error:** `WebSocket is closed before the connection is established`
- Solution: Ensure ML service is running and listening on port 8000
- Check: `curl http://localhost:8000/health`

### Audio Permission Denied
**Error:** `NotAllowedError: Permission denied by operating system.`
- Solution: Grant microphone permission when browser prompts
- For HTTPS: Microphone access requires secure context

### Model Inference Timeout
**Error:** `Slow-path inference timeout`
- Solution: CPU may be overloaded; try reducing concurrent sessions or increasing timeout
- Check: GPU availability and utilization

### High Latency in Fast-Path
**Error:** LCNN taking >200ms per chunk
- Solution: This suggests CPU bottleneck; consider:
  - Quantizing models (fp32 → fp16 or int8)
  - Using GPU (`VOICESHIELD_DEVICE=cuda`)
  - Reducing chunk size (trade-off: less audio context)

## Future Enhancements

1. **Browser Extension** for live call monitoring
   - Tab audio capture (WebAudio API)
   - Caller identification + risk notification
   - Call recording with consent

2. **Multi-Language Support** for prosody detection
   - Language detection on audio
   - Language-specific prosodic baselines
   - Multilingual speaker mixing detection

3. **Speaker Verification** (optional reference audio)
   - Compare ECAPA embeddings to reference
   - Enhance spoof detection with speaker consistency
   - Identify if different speaker mid-call

4. **Advanced Explainability**
   - Saliency maps (which frequencies/times triggered alert)
   - SHAP values per model
   - Interactive model ablation in UI

5. **Batch Export**
   - Export session transcripts
   - Generate PDF reports with charts
   - API for programmatic access

## Support & Resources

- **Docs:** `/docs/ARCHITECTURE.md`, `/docs/DETECTION_PIPELINE.md`
- **Issues:** GitHub Issues with label `streaming`
- **Performance:** See `/experiments/streaming_benchmarks.json`
