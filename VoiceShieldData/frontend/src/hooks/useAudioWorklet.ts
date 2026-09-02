/**
 * useAudioWorklet Hook
 * Captures real-time audio from microphone at 16kHz using AudioWorkletNode.
 * Provides 1.5-second chunks with 50% overlap (750ms hop) for streaming detection.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AudioChunk {
  seq: number;
  timestamp: number;
  sampleRate: number;
  durationMs: number;
  pcmData: Float32Array;
}

interface AudioWorkletState {
  isRecording: boolean;
  isInitialized: boolean;
  error: string | null;
}

export function useAudioWorklet(
  onChunkReady?: (chunk: AudioChunk) => void,
  onError?: (error: string) => void
) {
  const [state, setState] = useState<AudioWorkletState>({
    isRecording: false,
    isInitialized: false,
    error: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkCountRef = useRef(0);

  // Initialize AudioContext and AudioWorklet
  const initialize = useCallback(async () => {
    try {
      // Create AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Preserve full audio characteristics
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
        },
      });

      // Register worklet processor
      try {
        await audioContext.audioWorklet.addModule('/audioWorkletProcessor.js');
      } catch (e) {
        console.warn('AudioWorklet module not found, using fallback');
      }

      // Create AudioWorkletNode
      const workletNode = new AudioWorkletNode(audioContext, 'audio-chunk-processor', {
        processorOptions: {
          bufferSize: 1024, // ~64ms at 16kHz
          windowSize: 24000, // 1.5s at 16kHz
          hopSize: 12000, // 750ms hop (50% overlap)
        },
      });

      // Listen to audio chunks from worklet
      workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio_chunk') {
          const { pcmData, durationMs, sampleRate } = event.data;
          const chunk: AudioChunk = {
            seq: chunkCountRef.current++,
            timestamp: Date.now(),
            sampleRate,
            durationMs,
            pcmData: new Float32Array(pcmData),
          };
          onChunkReady?.(chunk);
        }
      };

      // Connect microphone → worklet → destination
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(workletNode);
      workletNode.connect(audioContext.destination); // Listen to output

      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      streamRef.current = stream;

      setState({
        isRecording: false,
        isInitialized: true,
        error: null,
      });

      console.log('[AudioWorklet] Initialized successfully at 16kHz');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize AudioWorklet';
      console.error('[AudioWorklet] Initialization error:', errorMsg);
      setState({
        isRecording: false,
        isInitialized: false,
        error: errorMsg,
      });
      onError?.(errorMsg);
    }
  }, [onChunkReady, onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!audioContextRef.current) {
      try {
        await initialize();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Initialization failed';
        setState((s) => ({ ...s, error: msg }));
        return;
      }
    }

    try {
      const audioContext = audioContextRef.current!;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      chunkCountRef.current = 0;
      setState((s) => ({ ...s, isRecording: true, error: null }));
      console.log('[AudioWorklet] Recording started');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to start recording';
      console.error('[AudioWorklet] Start error:', msg);
      setState((s) => ({ ...s, error: msg }));
      onError?.(msg);
    }
  }, [initialize, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.suspend();
      setState((s) => ({ ...s, isRecording: false }));
      console.log('[AudioWorklet] Recording stopped');
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopRecording();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    initialize,
    chunkCount: chunkCountRef.current,
  };
}
