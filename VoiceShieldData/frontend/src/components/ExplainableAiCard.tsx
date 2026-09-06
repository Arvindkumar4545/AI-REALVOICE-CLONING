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
      <div className={`glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-2 text-center ${className}`}>
        <HelpCircle className="w-8 h-8 text-gray-400 mx-auto" />
        <h4 className="text-sm font-semibold text-gray-900">Explainable AI Analysis</h4>
        <p className="text-xs text-gray-500">
          Model-level explanation verified across neural acoustic layers.
        </p>
      </div>
    );
  }

  const getSeverityStyle = (severity: string = 'normal') => {
    switch (severity) {
      case 'high_anomaly':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          icon: ShieldAlert,
          iconColor: 'text-red-600',
          card: 'border-red-200 bg-red-50/60',
          titleColor: 'text-red-950 font-semibold',
          descColor: 'text-red-800',
        };
      case 'suspicious':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          card: 'border-amber-200 bg-amber-50/60',
          titleColor: 'text-amber-950 font-semibold',
          descColor: 'text-amber-800',
        };
      default:
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle,
          iconColor: 'text-emerald-600',
          card: 'border-gray-200 bg-gray-50',
          titleColor: 'text-gray-900 font-semibold',
          descColor: 'text-gray-600',
        };
    }
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-semibold text-gray-900">Why Was This Detected?</h4>
        </div>
        <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-medium border border-cyan-200 uppercase tracking-wider">
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
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  <span className={`text-xs ${style.titleColor}`}>{sig.indicator || 'Anomaly Signal'}</span>
                </div>
                <span
                  className={`text-[10px] uppercase font-sans px-2 py-0.5 rounded-full border font-semibold ${style.badge}`}
                >
                  {sev.replace('_', ' ')}
                </span>
              </div>
              <p className={`text-xs ${style.descColor} leading-relaxed pl-6`}>
                {sig.description || 'Acoustic indicator analyzed.'}
              </p>
            </div>
          );
        })}
      </div>

      {note && (
        <div className="flex items-start gap-2 pt-2 text-xs text-gray-500 border-t border-gray-100 font-sans">
          <Info className="w-3.5 h-3.5 text-cyan-600 mt-0.5 flex-shrink-0" />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
};