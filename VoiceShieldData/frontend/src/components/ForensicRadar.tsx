import React from 'react';
import { ForensicMetrics } from '../types';
import { Activity, Radio, Volume2, Cpu } from 'lucide-react';

interface ForensicRadarProps {
  forensics?: ForensicMetrics | null | Record<string, any>;
  className?: string;
}

export const ForensicRadar: React.FC<ForensicRadarProps> = ({ forensics, className = '' }) => {
  if (!forensics) {
    return (
      <div className={`glass-card p-6 text-center text-xs text-[#64748B] ${className}`}>
        Forensic acoustic metrics computed on raw signal.
      </div>
    );
  }

  const spectralCentroid = Number(forensics.spectral_centroid_hz ?? forensics.spectral_centroid ?? 2200);
  const spectralRolloff = Number(forensics.spectral_rolloff_hz ?? forensics.spectral_rolloff ?? 4500);
  const highFreqEnergy = Number(forensics.high_freq_energy_ratio ?? 0.15);
  const silenceRatio = Number(forensics.silence_ratio ?? 0.22);
  const clippingRatio = Number(forensics.clipping_ratio ?? 0.001);

  const metricsList = [
    {
      label: 'Spectral Centroid',
      value: `${Math.round(spectralCentroid)} Hz`,
      desc: 'Brightness and formant distribution',
      score: Math.min(100, (spectralCentroid / 4000) * 100),
      icon: Activity,
    },
    {
      label: 'Spectral Rolloff (85%)',
      value: `${Math.round(spectralRolloff)} Hz`,
      desc: 'Bandwidth & vocoder cutoff limit',
      score: Math.min(100, (spectralRolloff / 8000) * 100),
      icon: Radio,
    },
    {
      label: 'High-Freq Energy (>4kHz)',
      value: `${(highFreqEnergy * 100).toFixed(1)}%`,
      desc: 'Upper spectrum synthesis energy',
      score: Math.min(100, highFreqEnergy * 300),
      icon: Cpu,
    },
    {
      label: 'Silence Gaps Ratio',
      value: `${(silenceRatio * 100).toFixed(1)}%`,
      desc: 'Speech pause natural cadence',
      score: Math.min(100, silenceRatio * 100),
      icon: Volume2,
    },
    {
      label: 'Clipping Saturation',
      value: `${(clippingRatio * 100).toFixed(2)}%`,
      desc: 'Digital waveform amplitude clipping',
      score: Math.min(100, clippingRatio * 2000),
      icon: Activity,
    },
  ];

  return (
    <div className={`glass-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#16324A] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#06B6D4]" />
          <h4 className="text-sm font-semibold text-[#F8FAFC] font-mono uppercase">Audio Signal Forensics</h4>
        </div>
        <span className="text-[11px] font-mono text-[#94A3B8]">
          {forensics.sample_rate || 16000}Hz • {forensics.duration_seconds || '3.0'}s
        </span>
      </div>

      <div className="space-y-3">
        {metricsList.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-[#94A3B8] font-medium font-mono">
                  <Icon className="w-3.5 h-3.5 text-[#06B6D4]" />
                  {m.label}
                </span>
                <span className="font-mono text-[#F8FAFC] font-bold">{m.value}</span>
              </div>
              <div className="h-1.5 w-full bg-[#071426] border border-[#16324A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] rounded-full transition-all duration-500"
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <p className="text-[10px] text-[#64748B] font-mono">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};