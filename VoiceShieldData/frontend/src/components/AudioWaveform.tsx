import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface AudioWaveformProps {
  audioUrl?: string;
  audioBlob?: Blob | null;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioUrl, audioBlob, className = '' }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    if (audioBlob) {
      url = URL.createObjectURL(audioBlob);
      setSourceUrl(url);

      // WebM/Opus blobs often have Infinity duration in HTMLAudioElement.
      // Decode using AudioContext to extract the exact real-world duration.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioBlob
        .arrayBuffer()
        .then((buf) => audioCtx.decodeAudioData(buf))
        .then((decoded) => {
          if (active && decoded && Number.isFinite(decoded.duration)) {
            setDuration(decoded.duration);
          }
        })
        .catch((err) => {
          console.warn('[AudioWaveform] WebAudio duration decode fallback:', err);
        })
        .finally(() => {
          if (audioCtx.state !== 'closed') audioCtx.close();
        });

      return () => {
        active = false;
        if (url) URL.revokeObjectURL(url);
      };
    } else if (audioUrl) {
      setSourceUrl(audioUrl);
    }
  }, [audioBlob, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (Number.isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [sourceUrl]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bars = 64;
    const barWidth = width / bars;
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

    for (let i = 0; i < bars; i++) {
      const normalizedI = i / bars;
      const wave = Math.sin(normalizedI * Math.PI * 4) * 0.4 + Math.cos(normalizedI * Math.PI * 8) * 0.3 + 0.3;
      const barHeight = Math.max(4, wave * height * 0.85);
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      if (normalizedI <= progress) {
        ctx.fillStyle = '#06B6D4'; // Cyan active
      } else {
        ctx.fillStyle = '#334155'; // Dark slate unplayed
      }

      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, 2);
      ctx.fill();
    }
  }, [currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current || !sourceUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('[AudioWaveform] Playback error:', err));
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || isNaN(secs) || secs < 0) {
      return '00:00';
    }
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`glass-card p-4 rounded-xl space-y-3 ${className}`}>
      {sourceUrl && <audio ref={audioRef} src={sourceUrl} preload="metadata" />}

      {/* Visualizer Canvas */}
      <canvas
        ref={canvasRef}
        width={480}
        height={64}
        className="w-full h-16 rounded-lg bg-slate-950/60"
      />

      {/* Audio Controls */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            disabled={!sourceUrl}
            className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center transition-all disabled:opacity-40"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={handleRestart}
            disabled={!sourceUrl}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1 text-slate-300 ml-2">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <span className="text-[11px] text-cyan-400/80 uppercase font-mono">
          {isPlaying ? 'Playing Audio' : 'Audio Ready'}
        </span>
      </div>
    </div>
  );
};
