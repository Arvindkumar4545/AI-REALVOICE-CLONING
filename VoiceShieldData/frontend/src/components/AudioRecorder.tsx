import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, RefreshCw, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (file: File, blob: Blob) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio Analyser for volume level meter
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round((average / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/wav';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? '.webm' : mimeType.includes('mp4') ? '.m4a' : '.wav';
        const file = new File([audioBlob], `mic_recording_${Date.now()}${ext}`, { type: mimeType });
        onRecordingComplete(file, audioBlob);
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      // Start duration counter (target 4-10s)
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          if (next >= 10) {
            // Auto stop at 10s maximum limit
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('[AudioRecorder] Mic permission error:', err);
      setError('Microphone permission denied or device not found.');
      stopAllMedia();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopAllMedia();
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 text-center">
      <div className="flex flex-col items-center justify-center space-y-3">
        {/* Pulsing Mic Button */}
        <div className="relative">
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
              style={{ transform: `scale(${1 + volumeLevel / 100})` }}
            />
          )}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/50 scale-105'
                : 'bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:scale-105'
            } disabled:opacity-50`}
          >
            {isRecording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
        </div>

        <div>
          <h4 className="text-base font-semibold text-white">
            {isRecording ? 'Listening & Analyzing...' : 'Live Microphone Capture'}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRecording
              ? `Recording: 00:0${recordingTime}s (Target: 4-10 seconds)`
              : 'Click to record real speech for instant deepfake scanning'}
          </p>
        </div>

        {/* Live Audio Level Meter */}
        {isRecording && (
          <div className="w-full max-w-xs space-y-1">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-red-400 transition-all duration-75"
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-40dB</span>
              <span>-12dB</span>
              <span>0dB</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/50">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
