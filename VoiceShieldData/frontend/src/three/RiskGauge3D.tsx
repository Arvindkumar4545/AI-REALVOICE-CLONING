import React, { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskGauge3DProps {
  score: number; // 0-100
  prediction?: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'INSUFFICIENT' | string;
  confidence?: number; // 0-100 (already a percentage from backend)
  showDetails?: boolean;
}

export const RiskGauge3D: React.FC<RiskGauge3DProps> = ({
  score = 0,
  prediction = 'BONA_FIDE',
  confidence = 95,
  showDetails = true,
}) => {
  const normalizedScore = Math.min(Math.max(score, 0), 100);
  // Confidence comes from backend as 0-100, normalize to ensure it's in valid range
  const normalizedConfidence = Math.min(Math.max(confidence, 0), 100);

  // Compute threat tier metadata using exact semantic colors
  const tier = useMemo(() => {
    if (normalizedScore >= 90) {
      return {
        label: 'CRITICAL THREAT',
        desc: 'Definitive synthetic voice clone detected with extreme confidence.',
        color: 'text-red-600',
        borderColor: 'border-red-200',
        bgGradient: 'from-red-50/40 to-white',
        decision: 'REVIEW',
        decisionColor: 'bg-red-600 text-white shadow-sm',
        icon: ShieldX,
      };
    }
    if (normalizedScore >= 70) {
      return {
        label: 'HIGH RISK',
        desc: 'Significant neural synthesis and spectral phase artifacts identified.',
        color: 'text-red-600',
        borderColor: 'border-red-200',
        bgGradient: 'from-red-50/40 to-white',
        decision: 'REVIEW',
        decisionColor: 'bg-red-600 text-white shadow-sm',
        icon: ShieldAlert,
      };
    }
    if (normalizedScore >= 50) {
      return {
        label: 'SUSPICIOUS / REVIEW',
        desc: 'Acoustic signals show mixed evidence; multi-model agreement is borderline.',
        color: 'text-amber-600',
        borderColor: 'border-amber-200',
        bgGradient: 'from-amber-50/40 to-white',
        decision: 'REVIEW',
        decisionColor: 'bg-amber-500 text-white shadow-sm',
        icon: AlertTriangle,
      };
    }
    if (normalizedScore >= 20) {
      return {
        label: 'LOW RISK',
        desc: 'Minor vocal anomalies detected, likely natural acoustic reverberation.',
        color: 'text-cyan-700',
        borderColor: 'border-cyan-200',
        bgGradient: 'from-cyan-50/40 to-white',
        decision: 'ALLOW',
        decisionColor: 'bg-emerald-600 text-white shadow-sm',
        icon: ShieldCheck,
      };
    }
    return {
      label: 'LIKELY GENUINE',
      desc: 'Natural human vocal cord harmonics and authentic micro-tremors verified.',
      color: 'text-emerald-700',
      borderColor: 'border-emerald-200',
      bgGradient: 'from-emerald-50/40 to-white',
      decision: 'ALLOW',
      decisionColor: 'bg-emerald-600 text-white shadow-sm',
      icon: ShieldCheck,
    };
  }, [normalizedScore]);

  const IconComponent = tier.icon;

  const radius = 90;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`glass-panel p-6 rounded-2xl border ${tier.borderColor} bg-gradient-to-b ${tier.bgGradient} relative overflow-hidden transition-all duration-500 shadow-sm`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl bg-white border border-gray-200 shadow-xs ${tier.color}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-sans uppercase tracking-wider text-gray-500 font-semibold">AI Voice Security Risk</span>
            <h4 className={`text-sm font-bold tracking-wide font-sans ${tier.color}`}>{tier.label}</h4>
          </div>
        </div>

        <div className={`px-3.5 py-1 rounded-full text-xs font-sans font-bold uppercase tracking-wider ${tier.decisionColor}`}>
          {tier.decision}
        </div>
      </div>

      {/* Radial Gauge Center */}
      <div className="relative flex flex-col items-center justify-center my-2">
        {/* SVG Gauge (Background Layer) */}
        <svg className="w-52 h-32 overflow-visible absolute z-0" viewBox="0 0 200 110">
          {/* Background Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active Risk Gradient Arc */}
          <path
            d="M 10 100 A 90 90 0 0 1 190 100"
            fill="none"
            stroke="url(#socRiskGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />

          <defs>
            <linearGradient id="socRiskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="35%" stopColor="#06B6D4" />
              <stop offset="60%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* Text Overlay (Front Layer - Always Visible) */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-6">
          <span className="text-4xl font-mono font-black text-slate-900 tracking-tight leading-none" style={{ WebkitTextFillColor: '#1F2937', color: '#1F2937', visibility: 'visible', opacity: 1 }}>
            {normalizedScore.toFixed(1)}%
          </span>
          <span className="text-[11px] font-sans text-slate-700 mt-1.5 font-semibold" style={{ visibility: 'visible', opacity: 1, color: '#374151' }}>
            Confidence: <span className="font-mono font-bold">{Math.round(normalizedConfidence)}%</span>
          </span>
        </div>
      </div>

      {/* Description & Action Footer */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-gray-200 text-xs space-y-2">
          <p className="text-gray-600 leading-relaxed text-[11px] font-sans">
            {tier.desc}
          </p>
          <div className="flex items-center justify-between text-[10px] font-sans text-gray-500 pt-1">
            <span>Enforcement Action:</span>
            <span className={`font-bold uppercase ${tier.color}`}>{tier.decision} CALL</span>
          </div>
        </div>
      )}
    </div>
  );
};
