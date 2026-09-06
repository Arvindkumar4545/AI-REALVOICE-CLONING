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
      <div className={`glass-panel p-6 rounded-2xl border border-gray-200 bg-white text-center text-xs text-gray-500 ${className}`}>
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
    <div className={`glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-semibold text-gray-900">Audio Signal Forensics</h4>
        </div>
        <span className="text-[11px] font-mono text-gray-500 font-medium">
          {forensics.sample_rate || 16000}Hz • {forensics.duration_seconds || '3.0'}s
        </span>
      </div>

      <div className="space-y-3">
        {metricsList.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 text-gray-700 font-medium font-sans">
                  <Icon className="w-3.5 h-3.5 text-cyan-600" />
                  {m.label}
                </span>
                <span className="font-mono text-gray-900 font-semibold">{m.value}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 border border-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 font-sans leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};