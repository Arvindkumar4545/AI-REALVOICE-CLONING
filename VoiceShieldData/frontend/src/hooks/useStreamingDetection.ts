/**
 * useStreamingDetection Hook
 * Manages WebSocket connection for real-time audio streaming and scoring.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioChunk } from './useAudioWorklet';

export interface ChunkScore {
  seq: number;
  riskScore: number;
  confidence: number;
  latencyMs: number;
}

export interface ConsensusUpdate {
  seq: number;
  riskScore: number;
  classification: 'BONA_FIDE' | 'UNCERTAIN' | 'SPOOF';
  modelBreakdown: Record<string, number>;
  explanation: Array<{
    signal: string;
    strength: number;
    explanation: string;
  }>;
  latencyMs: number;
}

export interface SessionEndedMessage {
  sessionId: string;
  finalVerdict: 'BONA_FIDE' | 'UNCERTAIN' | 'SPOOF' | 'INSUFFICIENT_AUDIO';
  durationMs: number;
  scoreTimeline: Array<any>;
  summary: {
    maxRiskScore: number;
    avgRiskScore: number;
    flaggedSegments: Array<any>;
  };
}

export interface StreamingState {
  isConnected: boolean;
  isStreaming: boolean;
  sessionId: string | null;
  lastChunkScore: ChunkScore | null;
  lastConsensus: ConsensusUpdate | null;
  scoreTimeline: (ChunkScore | ConsensusUpdate)[];
  finalVerdict: SessionEndedMessage | null;
  error: string | null;
  latencyMs: number;
  chunksSent: number;
}

const getWebSocketUrl = (sessionId: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = process.env.REACT_APP_ML_SERVICE_URL || 'localhost:8000';
  return `${protocol}//${host}/api/v1/stream/socket?sessionId=${sessionId}`;
};

export function useStreamingDetection(
  onChunkScore?: (score: ChunkScore) => void,
  onConsensusUpdate?: (consensus: ConsensusUpdate) => void,
  onSessionEnded?: (verdict: SessionEndedMessage) => void,
  onError?: (error: string) => void
) {
  const [state, setState] = useState<StreamingState>({
    isConnected: false,
    isStreaming: false,
    sessionId: null,
    lastChunkScore: null,
    lastConsensus: null,
    scoreTimeline: [],
    finalVerdict: null,
    error: null,
    latencyMs: 0,
    chunksSent: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pendingChunksRef = useRef<AudioChunk[]>([]);
  const reconnectAttemptRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_MS = 2000;

  // Create session and establish WebSocket connection
  const startSession = useCallback(async () => {
    try {
      console.log('[Streaming] Starting session...');

      // Create session on backend
      const sessionResponse = await fetch('/api/v1/stream/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!sessionResponse.ok) {
        throw new Error(`Session creation failed: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      sessionIdRef.current = sessionData.sessionId;

      // Connect WebSocket
      const wsUrl = getWebSocketUrl(sessionData.sessionId);
      console.log('[Streaming] Connecting to', wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Streaming] WebSocket connected');
        setState((s) => ({
          ...s,
          isConnected: true,
          sessionId: sessionData.sessionId,
          error: null,
        }));
        reconnectAttemptRef.current = 0;

        // Send any pending chunks
        pendingChunksRef.current.forEach((chunk) => {
          if (ws.readyState === WebSocket.OPEN) {
            sendAudioChunk(chunk, ws);
          }
        });
        pendingChunksRef.current = [];
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'chunk_score') {
            const score: ChunkScore = {
              seq: msg.seq,
              riskScore: msg.riskScore,
              confidence: msg.confidence,
              latencyMs: msg.latencyMs,
            };
            setState((s) => ({
              ...s,
              lastChunkScore: score,
              latencyMs: msg.latencyMs,
              scoreTimeline: [...s.scoreTimeline, score],
            }));
            onChunkScore?.(score);
          } else if (msg.type === 'consensus_update') {
            const consensus: ConsensusUpdate = {
              seq: msg.seq,
              riskScore: msg.riskScore,
              classification: msg.classification,
              modelBreakdown: msg.modelBreakdown,
              explanation: msg.explanation,
              latencyMs: msg.latencyMs,
            };
            setState((s) => ({
              ...s,
              lastConsensus: consensus,
              latencyMs: msg.latencyMs,
              scoreTimeline: [...s.scoreTimeline, consensus],
            }));
            onConsensusUpdate?.(consensus);
          } else if (msg.type === 'session_ended') {
            const verdict: SessionEndedMessage = msg;
            setState((s) => ({
              ...s,
              isStreaming: false,
              finalVerdict: verdict,
            }));
            onSessionEnded?.(verdict);
          } else if (msg.type === 'error') {
            const errorMsg = msg.message || 'Unknown error';
            setState((s) => ({ ...s, error: errorMsg }));
            onError?.(errorMsg);
          }
        } catch (err) {
          console.error('[Streaming] Message parse error:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[Streaming] WebSocket error:', event);
        const errorMsg = 'WebSocket connection error';
        setState((s) => ({ ...s, error: errorMsg }));
        onError?.(errorMsg);
      };

      ws.onclose = () => {
        console.log('[Streaming] WebSocket closed');
        setState((s) => ({
          ...s,
          isConnected: false,
          isStreaming: false,
        }));

        // Attempt reconnect
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptRef.current++;
          console.log(`[Streaming] Reconnecting... (attempt ${reconnectAttemptRef.current})`);
          setTimeout(() => {
            if (sessionIdRef.current) {
              const wsUrl = getWebSocketUrl(sessionIdRef.current);
              wsRef.current = new WebSocket(wsUrl);
            }
          }, RECONNECT_DELAY_MS);
        }
      };

      wsRef.current = ws;

      setState((s) => ({
        ...s,
        isStreaming: true,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Session creation failed';
      console.error('[Streaming] Start error:', errorMsg);
      setState((s) => ({ ...s, error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [onChunkScore, onConsensusUpdate, onSessionEnded, onError]);

  // Send audio chunk
  const sendAudioChunk = (chunk: AudioChunk, ws?: WebSocket) => {
    const websocket = ws || wsRef.current;

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      // Buffer chunk for later
      pendingChunksRef.current.push(chunk);
      return;
    }

    try {
      // Convert PCM to base64
      const pcmBuffer = chunk.pcmData.buffer;
      const bytes = new Uint8Array(pcmBuffer);
      const binaryString = String.fromCharCode(...bytes);
      const pcmBase64 = btoa(binaryString);

      const msg = {
        type: 'audio_chunk',
        seq: chunk.seq,
        sampleRate: chunk.sampleRate,
        durationMs: chunk.durationMs,
        pcmDataBase64: pcmBase64,
        timestamp: chunk.timestamp,
      };

      websocket.send(JSON.stringify(msg));

      setState((s) => ({
        ...s,
        chunksSent: s.chunksSent + 1,
      }));
    } catch (error) {
      console.error('[Streaming] Send chunk error:', error);
      pendingChunksRef.current.push(chunk);
    }
  };

  // End session
  const endSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'end_session',
        })
      );
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState((s) => ({
      ...s,
      isStreaming: false,
      isConnected: false,
    }));

    sessionIdRef.current = null;
  }, []);

  // Keep-alive ping
  useEffect(() => {
    if (!state.isConnected || !wsRef.current) {
      return;
    }

    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [state.isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startSession,
    sendAudioChunk,
    endSession,
  };
}
