import React, { useState } from 'react';
import { 
  Bot, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  MessageSquare,
  Sparkles,
  PhoneOff
} from 'lucide-react';

interface StorylineNode {
  id: string;
  label: string;
  intent?: string;
  severity?: string;
  status?: string;
}

interface DetectedIntent {
  intent: string;
  label: string;
  description: string;
  matched_phrases: string[];
  risk_contribution: number;
}

interface FraudCopilotPanelProps {
  currentAiRisk?: number;
}

export const FraudCopilotPanel: React.FC<FraudCopilotPanelProps> = ({ currentAiRisk = 45.0 }) => {
  const [transcriptInput, setTranscriptInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [copilotData, setCopilotData] = useState<{
    fraud_risk_score: number;
    risk_tier: string;
    detected_intents: DetectedIntent[];
    storyline_nodes: StorylineNode[];
    recommendations: string[];
    active_warning: boolean;
  } | null>({
    fraud_risk_score: 82.5,
    risk_tier: 'CRITICAL',
    detected_intents: [
      {
        intent: 'AUTHORITY_IMPERSONATION',
        label: 'Authority Claim',
        description: 'Caller claims official identity (Police / Cyber Cell)',
        matched_phrases: ['cyber cell', 'police officer', 'dcp'],
        risk_contribution: 25,
      },
      {
        intent: 'KYC_ACCOUNT_THREAT',
        label: 'Account Threat / KYC',
        description: 'Threatens immediate account freeze or SIM block',
        matched_phrases: ['kyc update', 'account freeze'],
        risk_contribution: 20,
      },
      {
        intent: 'OTP_CREDENTIAL_DEMAND',
        label: 'OTP / Credential Demand',
        description: 'Demands 6-digit verification code',
        matched_phrases: ['otp', 'chaar digit code'],
        risk_contribution: 30,
      },
    ],
    storyline_nodes: [
      { id: 'node_caller', label: 'INBOUND CALLER', status: 'active' },
      { id: 'node_auth', label: 'Authority Claim', severity: 'CRITICAL', status: 'triggered' },
      { id: 'node_threat', label: 'Account Threat', severity: 'HIGH', status: 'triggered' },
      { id: 'node_otp', label: 'OTP Demand', severity: 'CRITICAL', status: 'triggered' },
      { id: 'node_verdict', label: 'CRITICAL FRAUD ATTACK', status: 'danger' },
    ],
    recommendations: [
      'DO NOT share OTP, PIN, or passwords under any circumstances.',
      'Caller is using synthesized voice with police impersonation script.',
      'Hang up immediately and contact the official cybercrime helpline (1930).',
    ],
    active_warning: true,
  });

  const handleSimulateAnalysis = () => {
    if (!transcriptInput.trim()) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      // Evaluated in real-time
    }, 400);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-gray-200 bg-white space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-600">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-mono">
              REAL-TIME FRAUD COPILOT & STORYLINE
            </h3>
            <p className="text-xs text-gray-500">
              Multilingual intent scoring (English / Hindi / Hinglish) & Attack Chain Analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-xs text-gray-500">Combined Threat Index:</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold ${
              (copilotData?.fraud_risk_score || 0) >= 70
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {copilotData?.fraud_risk_score} / 100 ({copilotData?.risk_tier})
          </span>
        </div>
      </div>

      {/* Real-Time Attack Chain Storyline Graph */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-gray-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Social Engineering Attack Chain (Storyline Graph)
          </span>
          <span className="text-[10px] text-gray-500">Auto-correlated progression</span>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {copilotData?.storyline_nodes.map((node, i) => (
              <React.Fragment key={node.id}>
                <div
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm ${
                    node.status === 'danger'
                      ? 'bg-red-600 text-white animate-pulse'
                      : node.severity === 'CRITICAL'
                      ? 'bg-red-50 text-red-700 border border-red-300'
                      : node.severity === 'HIGH'
                      ? 'bg-amber-50 text-amber-700 border border-amber-300'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {node.status === 'danger' ? (
                    <ShieldAlert className="w-3.5 h-3.5" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>{node.label}</span>
                </div>
                {i < (copilotData?.storyline_nodes.length || 0) - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Active Warnings & Action Guidance */}
      {copilotData?.active_warning && (
        <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-bold text-xs font-mono">
            <AlertTriangle className="w-4 h-4" />
            <span>ACTIVE DEFENSE RECOMMENDATION</span>
          </div>
          <ul className="space-y-1 text-xs text-red-900 font-mono">
            {copilotData.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-red-600 font-bold">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Matched Conversational Intents */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-gray-700 font-mono">
          Detected Social Engineering Signals
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {copilotData?.detected_intents.map((item) => (
            <div
              key={item.intent}
              className="p-3 rounded-xl bg-white border border-gray-200 text-xs font-mono space-y-1.5 shadow-sm"
            >
              <div className="flex items-center justify-between font-bold">
                <span className="text-gray-900">{item.label}</span>
                <span className="text-red-600 font-bold">+{item.risk_contribution}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{item.description}</p>
              <div className="pt-1 flex flex-wrap gap-1">
                {item.matched_phrases.map((phrase, pi) => (
                  <span
                    key={pi}
                    className="px-2 py-0.5 rounded bg-gray-100 text-[10px] text-gray-700 font-mono"
                  >
                    "{phrase}"
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
