import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Cpu,
  ShieldAlert,
  Mic,
  Fingerprint,
  Zap,
  Layers,
  FileText,
  Sliders,
  Radio,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-Time Voice Analysis',
    tag: 'Latency < 100ms',
    desc: 'Analyzes active voice streams using continuous sliding 3.0s windows without audio delay or speech chopping.',
    benefits: ['Zero disruption to call flow', 'Instant threat notifications', 'Automated telephonic SIP intercept'],
  },
  {
    icon: Cpu,
    title: 'Multi-Model AI Ensemble',
    tag: '6 Neural Engines',
    desc: 'Combines Champion LCNN, BiLSTM prosody, WavLM phonetic representations, and RawNet2 sinc filters.',
    benefits: ['High cross-dataset generalization', 'No single point of failure', 'Consensus voting validation'],
  },
  {
    icon: ShieldAlert,
    title: 'Deepfake & Clone Detection',
    tag: 'AUC 0.9401',
    desc: 'Detects zero-shot voice clones, TTS synthesis, neural vocoders (HiFi-GAN, WaveNet), and audio splices.',
    benefits: ['Defeats zero-shot voice clones', 'Exposes vocoder phase anomalies', 'Identifies synthetic pitch dynamics'],
  },
  {
    icon: Zap,
    title: 'Interactive Liveness Challenge',
    tag: 'Anti-Replay',
    desc: 'Generates randomized phonetic security phrases to defeat pre-recorded playback and hijacked audio files.',
    benefits: ['Neutralizes replay attacks', 'Verifies real-time human intent', 'Instant acoustic response check'],
  },
  {
    icon: Fingerprint,
    title: '3D Voiceprint Biometrics',
    tag: '192-D ECAPA-TDNN',
    desc: 'Extracts deep speaker embeddings to match caller identity against authorized voiceprint registries.',
    benefits: ['Caller verification under 2 sec', 'Cross-call fraudster tracking', 'Anti-spoofing paired enrollment'],
  },
  {
    icon: Sparkles,
    title: 'Acoustic Forensics & XAI',
    tag: 'Explainable AI',
    benefits: ['Spectral centroid analysis', 'Jitter & Shimmer modeling', 'Forensic radar chart proof'],
    desc: 'Provides transparent explainability explaining exactly which acoustic anomalies triggered suspicious risk flags.',
  },
  {
    icon: Sliders,
    title: 'Calibrated Risk Scoring',
    tag: 'Brier 0.1312',
    benefits: ['Isotonic temperature calibration', 'Posterior probability modeling', 'Eliminates false confidence traps'],
    desc: 'Empirically calibrated risk indices from 0.0% to 100.0% reflecting true statistical posterior fraud probability.',
  },
  {
    icon: Radio,
    title: 'Live Telecom & SIP Intercept',
    tag: 'Enterprise Gateway',
    benefits: ['SIP trunk & FreeSWITCH hooks', 'Twilio / Asterisk compatibility', 'Sub-millisecond audio ingest'],
    desc: 'Seamlessly hooks into enterprise PBX, WebRTC media servers, and SIP trunking providers.',
  },
  {
    icon: FileText,
    title: 'Cryptographic Audit Trail',
    tag: 'SOC 2 Compliant',
    benefits: ['Immutable SHA-256 hash log', 'Operator decision tracking', 'Zero PII audio storage'],
    desc: 'Maintains tamper-evident logs of every inspection request, classification score, and automated enforcement action.',
  },
  {
    icon: Layers,
    title: 'Policy Enforcement Engine',
    tag: 'ALLOW / REVIEW / BLOCK',
    benefits: ['Customizable risk thresholds', 'Automated webhook triggers', 'Tiered routing for call centers'],
    desc: 'Configure flexible corporate enforcement policies to automatically drop, divert, or flag high-risk calls.',
  },
  {
    icon: Lock,
    title: 'Zero-Retention Privacy',
    tag: 'GDPR / HIPAA Ready',
    benefits: ['Ephemeral memory processing', 'No raw voice storage', 'Full on-premise air-gap option'],
    desc: 'Audio tensors are analyzed strictly in volatile memory and destroyed immediately after risk computation.',
  },
  {
    icon: Mic,
    title: 'Global Threat Intelligence',
    tag: '24/7 Threat Map',
    benefits: ['Real-time attack telemetry', 'Cross-industry fraud trends', 'Automated signature updates'],
    desc: 'Real-time telemetry mapping voice fraud campaigns, cloned voice signatures, and emerging vishing vectors.',
  },
];

export const FeaturesPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 cyber-grid-bg">
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-xs font-mono text-gray-900 font-semibold">
          <Layers className="w-3.5 h-3.5 text-gray-900" />
          <span>Platform Capabilities</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Enterprise Voice Security Features
        </h1>
        <p className="text-sm text-gray-600">
          Comprehensive defense architecture built to identify, explain, and neutralize AI voice threats.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map((f, idx) => {
          const Icon = f.icon;
          return (
            <div key={idx} className="glass-card p-6 space-y-4 glass-card-hover">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-900 font-semibold">
                  {f.tag}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">{f.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
              </div>

              <div className="pt-2 border-t border-gray-200 space-y-1.5">
                {f.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-gray-600 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-gray-200 text-center space-y-4 bg-gradient-to-r from-[#3B82F6]/10 via-[#0B1628] to-[#3B82F6]/10">
        <h3 className="text-xl font-bold text-gray-900">Ready to inspect voice threats in real time?</h3>
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

