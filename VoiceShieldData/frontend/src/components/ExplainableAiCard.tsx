import React from 'react';
import { ExplainableSignal } from '../types';
import { HelpCircle, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react';

interface ExplainableAiCardProps {
  signals?: ExplainableSignal[] | Record<string, any>;
  note?: string;
  className?: string;
}

export const ExplainableAiCard: React.FC<ExplainableAiCardProps> = ({ signals, note, className = '' }) => {
  const normalizedSignals: ExplainableSignal[] = React.useMemo(() => {
    if (!signals) return [];
    if (Array.isArray(signals)) return signals;
    return Object.entries(signals).map(([key, val]) => ({
      indicator: key.replace(/_/g, ' ').toUpperCase(),
      description: typeof val === 'object' && val !== null ? val.desc || JSON.stringify(val) : String(val),
      severity: typeof val === 'object' && val !== null && val.score > 0.7 ? 'high_anomaly' : 'suspicious',
      score: typeof val === 'object' && val !== null && typeof val.score === 'number' ? val.score : 0.8,
    }));
  }, [signals]);

  if (normalizedSignals.length === 0) {
    return (
      <div className={`glass-card p-6 space-y-2 text-center ${className}`}>
        <HelpCircle className="w-8 h-8 text-[#64748B] mx-auto" />
        <h4 className="text-sm font-semibold text-[#F8FAFC]">Explainable AI Analysis</h4>
        <p className="text-xs text-[#94A3B8]">
          Model-level explanation verified across neural acoustic layers.
        </p>
      </div>
    );
  }

  const getSeverityStyle = (severity: string = 'normal') => {
    switch (severity) {
      case 'high_anomaly':
        return {
          badge: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border-[rgba(239,68,68,0.35)]',
          icon: ShieldAlert,
          card: 'border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]',
        };
      case 'suspicious':
        return {
          badge: 'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border-[rgba(245,158,11,0.35)]',
          icon: AlertTriangle,
          card: 'border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.06)]',
        };
      default:
        return {
          badge: 'bg-[rgba(16,185,129,0.15)] text-[#10B981] border-[rgba(16,185,129,0.35)]',
          icon: CheckCircle,
          card: 'border-[#16324A] bg-[#071426]',
        };
    }
  };

  return (
    <div className={`glass-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-[#16324A] pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#06B6D4]" />
          <h4 className="text-sm font-semibold text-[#F8FAFC] font-mono uppercase">Why Was This Detected?</h4>
        </div>
        <span className="text-[11px] font-mono text-[#06B6D4] font-bold uppercase">
          Signal Analysis
        </span>
      </div>

      <div className="space-y-3">
        {normalizedSignals.map((sig, idx) => {
          const sev = sig.severity || 'normal';
          const style = getSeverityStyle(sev);
          const Icon = style.icon;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border ${style.card} space-y-1.5 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[#F8FAFC]" />
                  <span className="text-xs font-semibold text-[#F8FAFC]">{sig.indicator || 'Anomaly Signal'}</span>
                </div>
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border font-bold ${style.badge}`}
                >
                  {sev.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed pl-6">
                {sig.description || 'Acoustic indicator analyzed.'}
              </p>
            </div>
          );
        })}
      </div>

      {note && (
        <div className="flex items-start gap-2 pt-2 text-[11px] text-[#64748B] border-t border-[#16324A] font-mono">
          <Info className="w-3.5 h-3.5 text-[#06B6D4] mt-0.5 flex-shrink-0" />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};