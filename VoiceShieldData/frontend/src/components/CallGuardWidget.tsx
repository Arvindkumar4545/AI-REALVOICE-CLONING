import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  PhoneCall, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface CallGuardProps {
  voiceAuthenticity?: string; // 'LIKELY_HUMAN' | 'SYNTHETIC_SUSPECTED'
  voiceConfidence?: number;   // 0 - 100
  conversationRisk?: string;  // 'LOW' | 'SUSPICIOUS' | 'HIGH' | 'CRITICAL'
  conversationRiskScore?: number;
  activeStage?: number;       // 0 to 4
  callerId?: string;
  onAction?: (action: string) => void;
  className?: string;
}

const PROGRESSIVE_STAGES = [
  { time: '00:15', label: 'Call Connected & Baseline Normal', threat: 'NORMAL', severity: 'low' },
  { time: '00:34', label: 'Authority Claim (Police / Bank Officer)', threat: 'WATCH', severity: 'watch' },
  { time: '00:52', label: 'Artificial Urgency & Coercion Pressure', threat: 'SUSPICIOUS', severity: 'suspicious' },
  { time: '01:12', label: 'Financial Action / Immediate Fund Movement', threat: 'HIGH RISK', severity: 'high' },
  { time: '01:29', label: 'Sensitive OTP / Password / PIN Demand', threat: 'CRITICAL', severity: 'critical' },
];

export const CallGuardWidget: React.FC<CallGuardProps> = ({
  voiceAuthenticity = 'LIKELY_HUMAN',
  voiceConfidence = 91,
  conversationRisk = 'HIGH',
  conversationRiskScore = 78,
  activeStage: initialStage = 3,
  callerId = '+91 98721 00412',
  onAction,
  className = '',
}) => {
  const [selectedStage, setSelectedStage] = useState<number>(initialStage);
  const [actionTriggered, setActionTriggered] = useState<string | null>(null);

  const isHuman = voiceAuthenticity === 'LIKELY_HUMAN';
  const isHighRisk = conversationRiskScore >= 60;

  // Determine scenario
  const getScenarioBadge = () => {
    if (isHuman && !isHighRisk) {
      return {
        scenario: 'SCENARIO A: VERIFIED HUMAN • SAFE',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        recommendation: 'Allow standard call processing. No threat indicators present.',
      };
    }
    if (isHuman && isHighRisk) {
      return {
        scenario: 'SCENARIO B: HUMAN CALLER • HIGH SOCIAL ENGINEERING',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
        recommendation: 'Independent verification required. Human voice detected attempting coercion/financial fraud.',
      };
    }
    if (!isHuman && !isHighRisk) {
      return {
        scenario: 'SCENARIO C: SYNTHETIC VOICE • LOW INTENT RISK',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
        recommendation: 'Step-up authentication required. AI voice detected but no overt fraud intent yet.',
      };
    }
    return {
      scenario: 'SCENARIO D: SYNTHETIC VOICE • CRITICAL FINANCIAL ATTACK',
      badgeColor: 'bg-red-50 text-red-800 border-red-300',
      recommendation: 'CRITICAL ALERT: Synthetic clone detected demanding credentials/funds. Escalate immediately.',
    };
  };

  const scenarioInfo = getScenarioBadge();

  const handleTrigger = (actionName: string) => {
    setActionTriggered(actionName);
    if (onAction) onAction(actionName);
  };

  return (
    <div className={`glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-5 shadow-sm ${className}`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 font-sans">
                VoiceShield Call Guard
              </h3>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                Active Intercept
              </span>
            </div>
            <p className="text-xs text-gray-500 font-sans mt-0.5">
              Live Session: <span className="font-mono font-medium text-gray-800">{callerId}</span> • Trunk: <span className="font-mono">PBX-INBOUND-01</span>
            </p>
          </div>
        </div>

        <span className={`text-xs font-sans font-semibold px-3 py-1 rounded-full border ${scenarioInfo.badgeColor}`}>
          {scenarioInfo.scenario}
        </span>
      </div>

      {/* Dual-Score Disaggregation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Layer 1: Voice Authenticity */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans uppercase tracking-wider text-gray-500 font-medium">
              Layer 1: Voice Authenticity
            </span>
            <span className={`text-xs font-semibold font-sans ${isHuman ? 'text-emerald-700' : 'text-red-600'}`}>
              {isHuman ? '✓ Likely Human' : '✗ Synthetic Clone'}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 font-sans">
            <span className="font-mono">{voiceConfidence}%</span> <span className="text-xs font-normal text-gray-500 font-sans">Confidence</span>
          </div>
          <p className="text-xs text-gray-600 font-sans leading-relaxed">
            Acoustic biometric signature: natural formant micro-tremors verified.
          </p>
        </div>

        {/* Layer 2: Conversation Intent & Fraud Risk */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-sans uppercase tracking-wider text-red-600 font-semibold">
              Layer 2: Conversation Risk
            </span>
            <span className="text-xs font-semibold font-sans text-red-700 bg-red-100/80 px-2 py-0.5 rounded border border-red-200">
              {conversationRisk} (<span className="font-mono">Score: {conversationRiskScore}/100</span>)
            </span>
          </div>
          <div className="text-2xl font-bold text-red-950 font-sans">
            Critical Indicators <span className="text-xs font-normal text-red-700 font-sans">Detected</span>
          </div>
          <p className="text-xs text-red-700 font-sans leading-relaxed">
            Coercion & authority impersonation patterns identified in speech cadence.
          </p>
        </div>
      </div>

      {/* Progressive Early Warning Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-sans">
          <span className="font-semibold text-gray-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            Early Warning Threat Sequence
          </span>
          <span className="text-gray-500 text-xs">
            Avg Time-to-Warning: <strong className="text-gray-800 font-mono">34.2s</strong>
          </span>
        </div>

        <div className="space-y-2">
          {PROGRESSIVE_STAGES.map((st, idx) => {
            const isReached = idx <= selectedStage;
            const isCurrent = idx === selectedStage;
            return (
              <div
                key={idx}
                onClick={() => setSelectedStage(idx)}
                className={`p-3 rounded-xl border text-xs font-sans transition-all cursor-pointer flex items-center justify-between ${
                  isCurrent
                    ? 'bg-red-50 border-red-300 shadow-xs'
                    : isReached
                    ? 'bg-gray-50 border-gray-200 text-gray-800'
                    : 'bg-white border-dashed border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                    isCurrent ? 'bg-red-600 text-white' : isReached ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {st.time}
                  </span>
                  <span className={isCurrent ? 'font-semibold text-gray-900' : isReached ? 'text-gray-700 font-medium' : 'text-gray-400'}>
                    {st.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase font-sans ${
                    st.severity === 'critical'
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : st.severity === 'high'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : st.severity === 'suspicious'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {st.threat}
                  </span>
                  {isReached && <CheckCircle2 className="w-4 h-4 text-cyan-600" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Enforcement Recommendation Banner */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs font-sans space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-semibold">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Organization Enforcement Action</span>
        </div>
        <p className="text-amber-800 text-xs leading-relaxed font-sans">
          {scenarioInfo.recommendation}
        </p>
      </div>

      {/* Operator Intervention Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => handleTrigger('STEP_UP_AUTH')}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-sans font-medium flex items-center gap-2 transition-all shadow-xs"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Enforce Step-Up Verification</span>
        </button>

        <button
          onClick={() => handleTrigger('ALERT_SUPERVISOR')}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-sans font-medium flex items-center gap-2 transition-all shadow-xs"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Alert Floor Supervisor</span>
        </button>

        <button
          onClick={() => handleTrigger('LOG_INCIDENT')}
          className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 text-xs font-sans font-medium flex items-center gap-2 transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Create Investigation Case</span>
        </button>
      </div>

      {actionTriggered && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-sans flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span>Action Dispatched: <strong>{actionTriggered}</strong> recorded in compliance audit trail.</span>
        </div>
      )}
    </div>
  );
};
