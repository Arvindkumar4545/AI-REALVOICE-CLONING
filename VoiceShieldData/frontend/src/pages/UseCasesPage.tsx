import React from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark,
  Radio,
  Building,
  Shield,
  Briefcase,
  Scale,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

const USE_CASES = [
  {
    icon: Landmark,
    title: 'Banking & Financial Wire Fraud',
    badge: 'Finance / Wealth Management',
    threat: 'Criminals clone high-net-worth customer voices or CFOs to authorize fraudulent wire transfers and account resets.',
    solution: 'VoiceShield AI inspects inbound authorization calls in sub-100ms, immediately detecting synthetic voice clones before fund release.',
    impact: 'Prevents multi-million dollar unauthorized transfers and preserves customer trust.',
  },
  {
    icon: Radio,
    title: 'Call Center Agent Protection',
    badge: 'Customer Support / BPO',
    threat: 'Social engineering bots and real-time conversational TTS agents call customer support to bypass OTPs and reset passwords.',
    solution: 'Integrates via SIP trunking to generate instant screen-pop alerts for agents when an inbound voice shows synthetic anomalies.',
    impact: 'Reduces fraud loss, protects sensitive credentials, and slashes manual verification time.',
  },
  {
    icon: Building,
    title: 'Insurance First Notice of Loss (FNOL)',
    badge: 'Claims Investigation',
    threat: 'Fraud rings submit fabricated loss claims across thousands of identities using cloned voices to sound authentic.',
    solution: 'Analyzes voice authenticity during the initial claim recording and flags synthetic or manipulated vocal recordings.',
    impact: 'Eliminates synthetic claims fraud and protects loss ratios.',
  },
  {
    icon: Briefcase,
    title: 'Executive Impersonation (CEO Fraud)',
    badge: 'Corporate Security',
    threat: 'Deepfaked executive audio commands finance employees during fabricated emergency mergers or confidential deals.',
    solution: 'Mandatory verification gateway for internal corporate phone calls requesting financial or administrative privilege changes.',
    impact: 'Immunity against corporate vishing and brand extortion attacks.',
  },
  {
    icon: Shield,
    title: 'Telecom Carrier Anti-Spoofing',
    badge: 'Carrier & Network Ops',
    threat: 'Automated robocall campaigns using synthetic voices flood telecommunication networks with scam campaigns.',
    solution: 'Network-level SIP stream sampling to flag and drop known AI-generated voice scam patterns at the switch level.',
    impact: 'Maintains carrier network reputation and protects millions of subscribers.',
  },
  {
    icon: Scale,
    title: 'Government & Defense Communications',
    badge: 'National Security / Defense',
    threat: 'Hostile state actors manipulate voice recordings of defense leadership to disseminate disinformation or unauthorized commands.',
    solution: 'Air-gapped on-premise forensic inspection verifying audio authenticity down to the micro-second physical vocal cord tremor.',
    impact: 'Guarantees the authenticity of mission-critical defense and governmental directives.',
  },
];

export const UseCasesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 cyber-grid-bg">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-xs font-mono text-gray-900 font-semibold">
          <Briefcase className="w-3.5 h-3.5 text-gray-900" />
          <span>Industry Solutions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Enterprise Voice Security Use Cases
        </h1>
        <p className="text-sm text-gray-600">
          Tailored forensic defense protecting organizations from the financial and reputational fallout of AI voice fraud.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {USE_CASES.map((uc, idx) => {
          const Icon = uc.icon;
          return (
            <div key={idx} className="glass-panel p-8 rounded-3xl border border-gray-200 space-y-6 glass-card-hover">
              <div className="flex items-center justify-between">
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-900 font-bold">
                  {uc.badge}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-gray-900">{uc.title}</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] space-y-1">
                  <span className="font-bold text-[#EF4444] font-mono uppercase text-[10px]">Threat Scenario:</span>
                  <p className="text-gray-900 leading-relaxed">{uc.threat}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.25)] space-y-1">
                  <span className="font-bold text-gray-900 font-mono uppercase text-[10px]">VoiceShield Solution:</span>
                  <p className="text-gray-900 leading-relaxed">{uc.solution}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200 flex items-center gap-2 text-[11px] font-mono text-[#10B981] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                <span>{uc.impact}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-gray-200 text-center space-y-4 bg-gradient-to-r from-[#3B82F6]/10 via-[#0B1628] to-[#3B82F6]/10">
        <h3 className="text-xl font-bold text-gray-900">Protect your organization against voice fraud today</h3>
        <Link
          to="/detect"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] text-white font-bold font-mono text-xs shadow-[0_0_30px_rgba(6,182,212,0.25)] hover:scale-[1.02] transition-all"
        >
          <span>Launch Voice Inspector</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
