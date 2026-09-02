import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useStreamingDetection, SessionEndedMessage } from '../hooks/useStreamingDetection';
import { useAudioWorklet, AudioChunk } from '../hooks/useAudioWorklet';
import { LiveAnalysisPanel } from '../components/LiveAnalysisPanel';
import { LiveShield3D } from '../components/LiveShield3D';
import { RiskTimeline } from '../components/RiskTimeline';
import { ExplainableAiCard } from '../components/ExplainableAiCard';

export const StreamingDetectionExample: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartTimeRef = useRef<number | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSessionEnded = (verdict: SessionEndedMessage) => {
    console.log('[StreamingDetection] Session finalized:', verdict);
  };

  const streamingDetection = useStreamingDetection(
    undefined,
    undefined,
    handleSessionEnded
  );

  const audioWorklet = useAudioWorklet((chunk: AudioChunk) => {
    if (streamingDetection.isConnected) {
      streamingDetection.sendAudioChunk(chunk);
    }
  });

  useEffect(() => {
    if (audioWorklet.isRecording && sessionStartTimeRef.current) {
      elapsedIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current!) / 1000);
        setElapsedSeconds(elapsed);
      }, 100);
    }

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, [audioWorklet.isRecording]);

  const handleStartRecording = async () => {
    try {
      setError(null);
      sessionStartTimeRef.current = Date.now();
      setElapsedSeconds(0);
      await streamingDetection.startSession();
      await audioWorklet.startRecording();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
    }
  };

  const handleStopRecording = async () => {
    try {
      audioWorklet.stopRecording();
      streamingDetection.endSession();
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6 cyber-grid-bg">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Real-Time Voice Authentication
        </h1>
        <p className="text-slate-400">
          Continuous audio analysis while you speak. Instant risk scoring and neural explanation.
        </p>
      </div>

      {!streamingDetection.isConnected && (
        <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-center gap-3 text-amber-300 text-xs">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Not connected to streaming service. Click "Start Recording" to connect.</span>
        </div>
      )}

      {streamingDetection.isConnected && (
        <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 flex items-center gap-3 text-emerald-300 text-xs">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Connected to live streaming service. Ready to analyze audio.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/50 border border-red-900 rounded-xl p-4 text-xs text-red-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveAnalysisPanel
          isRecording={audioWorklet.isRecording}
          isConnected={streamingDetection.isConnected}
          elapsedSeconds={elapsedSeconds}
          riskScore={streamingDetection.lastConsensus?.riskScore ?? 0}
          classification={streamingDetection.lastConsensus?.classification}
          chunksSent={streamingDetection.chunksSent}
          latencyMs={streamingDetection.latencyMs}
          onStart={handleStartRecording}
          onStop={handleStopRecording}
        />

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-center">
          <LiveShield3D
            riskScore={streamingDetection.lastConsensus?.riskScore ?? 0}
            isAnimating={audioWorklet.isRecording}
            size={300}
          />
        </div>
      </div>

      <RiskTimeline
        chunkScores={streamingDetection.scoreTimeline.filter(
          (s) => 'confidence' in s && 'latencyMs' in s
        ) as any[]}
        consensusUpdates={streamingDetection.scoreTimeline.filter(
          (s) => 'classification' in s && 'modelBreakdown' in s
        ) as any[]}
      />

      {streamingDetection.lastConsensus && (
        <ExplainableAiCard
          signals={streamingDetection.lastConsensus.explanation as any}
          note="Live streaming consensus computed continuously across sliding audio buffers."
        />
      )}
    </div>
  );
};
