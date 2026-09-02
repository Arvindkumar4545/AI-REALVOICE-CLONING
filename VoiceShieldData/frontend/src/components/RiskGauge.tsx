import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

interface RiskGaugeProps {
  score: number | null | undefined; // 0 to 100
  prediction: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'SUSPICIOUS' | 'INSUFFICIENT_AUDIO' | string;
  confidence: number | null | undefined;
  className?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, prediction, confidence, className = '' }) => {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  
  const isValidScore = typeof score === 'number' && Number.isFinite(score) && !isNaN(score);
  const isValidConfidence = typeof confidence === 'number' && Number.isFinite(confidence) && !isNaN(confidence);

  const isInsufficient = prediction === 'INSUFFICIENT_AUDIO' || !isValidScore;
  const safeScore = isValidScore ? Math.max(0, Math.min(100, score!)) : 0;
  const displayScore = isInsufficient ? '—' : `${Math.round(safeScore * 10) / 10}%`;
  const displayConfidence = isValidConfidence ? `${Math.round(confidence! * 10) / 10}%` : 'Unavailable';
  const strokeDashoffset = isInsufficient ? circumference : circumference - (safeScore / 100) * circumference;

  let strokeColor = '#06B6D4'; // Cyan (Safe)
  let statusBadge = {
    label: 'AUTHENTIC / BONA-FIDE',
    badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
    icon: ShieldCheck,
    textClass: 'gradient-text-safe',
  };

  if (isInsufficient) {
    strokeColor = '#64748B'; // Slate (Neutral)
    statusBadge = {
      label: 'INSUFFICIENT SPEECH / SILENCE',
      badgeClass: 'bg-slate-900/80 text-slate-400 border-slate-700',
      icon: AlertTriangle,
      textClass: 'text-slate-400',
    };
  } else if (prediction === 'SPOOF' || safeScore > 65) {
    strokeColor = '#EF4444'; // Red (High Risk)
    statusBadge = {
      label: 'THREAT DETECTED / SPOOF',
      badgeClass: 'bg-red-950/80 text-red-400 border-red-800 animate-pulse',
      icon: ShieldAlert,
      textClass: 'gradient-text-threat',
    };
  } else if (prediction === 'UNCERTAIN' || prediction === 'SUSPICIOUS' || safeScore >= 35) {
    strokeColor = '#F59E0B'; // Amber (Moderate Risk)
    statusBadge = {
      label: 'UNCERTAIN / REVIEW REQUIRED',
      badgeClass: 'bg-amber-950/80 text-amber-400 border-amber-800',
      icon: AlertTriangle,
      textClass: 'text-amber-400',
    };
  }

  const IconComponent = statusBadge.icon;

  return (
    <div className={`glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 ${className}`}>
      {/* Status Badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusBadge.badgeClass}`}>
        <IconComponent className="w-4 h-4" />
        <span>{statusBadge.label}</span>
      </div>

      {/* SVG Circular Gauge */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#1E293B"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Animated Value Arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={strokeColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Value */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`text-3xl font-black tracking-tight ${statusBadge.textClass}`}>
            {displayScore}
          </span>
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Risk Index
          </span>
        </div>
      </div>

      {/* Confidence Metrics */}
      <div className="grid grid-cols-2 gap-4 w-full pt-2 border-t border-slate-800/80 text-center font-mono text-xs">
        <div>
          <div className="text-slate-400 text-[11px]">Model Confidence</div>
          <div className="text-sm font-bold text-white mt-0.5">{displayConfidence}</div>
        </div>
        <div>
          <div className="text-slate-400 text-[11px]">Classification</div>
          <div className="text-sm font-bold text-cyan-400 mt-0.5">{prediction || 'Analysis unavailable'}</div>
        </div>
      </div>
    </div>
  );
};
