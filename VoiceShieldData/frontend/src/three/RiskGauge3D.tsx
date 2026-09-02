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
        color: 'text-[#EF4444]',
        borderColor: 'border-[#EF4444]/40',
        bgGradient: 'from-[#EF4444]/10 via-[#0B1628] to-[#0B1628]',
        decision: 'REVIEW',
        decisionColor: 'bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]',
        icon: ShieldX,
      };
    }
    if (normalizedScore >= 70) {
      return {
        label: 'HIGH RISK',
        desc: 'Significant neural synthesis and spectral phase artifacts identified.',
        color: 'text-[#EF4444]',
        borderColor: 'border-[#EF4444]/30',
        bgGradient: 'from-[#EF4444]/10 via-[#0B1628] to-[#0B1628]',
        decision: 'REVIEW',
        decisionColor: 'bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]',
        icon: ShieldAlert,
      };
    }
    if (normalizedScore >= 50) {
      return {
        label: 'SUSPICIOUS / REVIEW',
        desc: 'Acoustic signals show mixed evidence; multi-model agreement is borderline.',
        color: 'text-[#F59E0B]',
        borderColor: 'border-[#F59E0B]/30',
        bgGradient: 'from-[#F59E0B]/10 via-[#0B1628] to-[#0B1628]',
        decision: 'REVIEW',
        decisionColor: 'bg-[#F59E0B] text-[#020817] shadow-[0_0_20px_rgba(245,158,11,0.35)]',
        icon: AlertTriangle,
      };
    }
    if (normalizedScore >= 20) {
      return {
        label: 'LOW RISK',
        desc: 'Minor vocal anomalies detected, likely natural acoustic reverberation.',
        color: 'text-[#06B6D4]',
        borderColor: 'border-[#06B6D4]/30',
        bgGradient: 'from-[#06B6D4]/10 via-[#0B1628] to-[#0B1628]',
        decision: 'ALLOW',
        decisionColor: 'bg-[#10B981] text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]',
        icon: ShieldCheck,
      };
    }
    return {
      label: 'LIKELY GENUINE',
      desc: 'Natural human vocal cord harmonics and authentic micro-tremors verified.',
      color: 'text-[#10B981]',
      borderColor: 'border-[#10B981]/30',
      bgGradient: 'from-[#10B981]/10 via-[#0B1628] to-[#0B1628]',
      decision: 'ALLOW',
      decisionColor: 'bg-[#10B981] text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]',
      icon: ShieldCheck,
    };
  }, [normalizedScore]);

  const IconComponent = tier.icon;

  const radius = 90;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`glass-card p-6 rounded-2xl border ${tier.borderColor} bg-gradient-to-b ${tier.bgGradient} relative overflow-hidden transition-all duration-500`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2.5 rounded-xl bg-[#071426] border border-[#16324A] ${tier.color}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]">AI Voice Security Risk</span>
            <h4 className={`text-sm font-bold tracking-wide ${tier.color}`}>{tier.label}</h4>
          </div>
        </div>

        <div className={`px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${tier.decisionColor}`}>
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
            stroke="#16324A"
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
          <span className="text-[11px] font-mono text-slate-700 mt-1.5 font-semibold" style={{ visibility: 'visible', opacity: 1, color: '#374151' }}>
            Confidence: {Math.round(normalizedConfidence)}%
          </span>
        </div>
      </div>

      {/* Description & Action Footer */}
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-[#16324A] text-xs space-y-2">
          <p className="text-[#94A3B8] leading-relaxed text-[11px]">
            {tier.desc}
          </p>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B] pt-1">
            <span>Enforcement Action:</span>
            <span className="font-bold text-[#F8FAFC] uppercase">{tier.decision} CALL</span>
          </div>
        </div>
      )}
    </div>
  );
};
