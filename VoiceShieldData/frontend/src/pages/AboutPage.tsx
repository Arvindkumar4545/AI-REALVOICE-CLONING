import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Activity,
  Layers,
  Zap,
  Lock,
  Cpu,
  Landmark,
  Radio,
  Building,
  Scale,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Fingerprint,
  Brain,
} from 'lucide-react';
import { SecurityCore3D } from '../three/SecurityCore3D';
import { Pipeline3DVisualizer } from '../three/Pipeline3DVisualizer';
import { FeatureCard } from '../components/FeatureCard';
import { SecurityBadge } from '../components/SecurityBadge';
import { StatsCard } from '../components/StatsCard';

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full space-y-24 pb-20 cyber-grid-bg">
      {/* 1. HERO */}
      <section className="relative min-h-[60vh] flex items-center justify-center pt-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 border border-gray-300 text-xs font-mono text-gray-900 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-gray-900" />
              <span>About VoiceShield AI Operations</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              TRUST EVERY <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 via-gray-700 to-gray-900">
                VOICE INTERACTION.
              </span>
            </h1>
            <p className="text-base text-gray-600 max-w-xl leading-relaxed font-normal">
              AI-powered voice security engineered to detect synthetic speech, deepfake voice cloning, and audio impersonation in real-time across enterprise call operations.
            </p>
            <div className="pt-2">
              <Link
                to="/detect"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-bold font-mono text-xs inline-flex items-center gap-2 shadow-md transition-all"
              >
                <span>Launch Voice Inspector</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full max-w-sm h-80 relative">
              <SecurityCore3D />
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION 1: WHAT IS VOICESHIELD AI? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-gray-200 space-y-6">
          <div className="max-w-3xl space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">What is VoiceShield AI?</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              VoiceShield AI is an enterprise-grade cybersecurity platform built specifically to neutralize the rapidly escalating threat of AI voice cloning and audio deepfakes. By combining cutting-edge digital signal forensics with calibrated deep neural networks, VoiceShield AI continuously inspects vocal dynamics to distinguish genuine human voices from synthetic speech algorithms.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Modern generative voice synthesis can replicate an executive or customer from as little as 3 seconds of reference audio. VoiceShield AI acts as an active cryptographic and acoustic shield across live telecom channels, SIP trunks, and call center streams.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: THE PROBLEM (MODERN VOICE FRAUD) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-[11px] font-mono text-[#EF4444] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444]" />
            <span>The Threat Landscape</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">The Rising Crisis in Voice Security</h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Generative AI has democratized zero-shot voice cloning, rendering legacy voice biometric auth obsolete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">01. AI Voice Cloning</div>
            <h4 className="text-base font-bold text-gray-900">Zero-Shot Synthesis</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Adversaries clone high-profile targets from brief public speech clips to authorize high-value transactions.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">02. Deepfake Calls Real-Time Conversational Bots</div>
            <h4 className="text-base font-bold text-gray-900">AI Impersonation Attacks</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Low-latency conversational AI agents can interact dynamically with customer support teams and executives.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">03. Social Engineering</div>
            <h4 className="text-base font-bold text-gray-900">Real-Time Conversational Bots</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ultra-low latency text-to-speech agents interact with customer support staff to reset multi-factor credentials.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">03. Social Engineering</div>
            <h4 className="text-base font-bold text-gray-900">Executive Impersonation (CEO Fraud)</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Scammers simulate trusted internal figures during urgent corporate crises to bypass standard security review.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">04. Synthetic Speech</div>
            <h4 className="text-base font-bold text-gray-900">Neural Vocoder Artifacts</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              WaveNet, HiFi-GAN, and diffusion models leave subtle spectral anomalies that VoiceShield forensics detects.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">05. Caller Spoofing</div>
            <h4 className="text-base font-bold text-gray-900">Telco ID Manipulation</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Pairing spoofed caller IDs with AI voices easily tricks traditional security protocols without acoustic vetting.
            </p>
          </div>

          <div className="glass-card p-6 space-y-2">
            <div className="text-xs font-mono font-bold text-[#EF4444] uppercase">06. Financial Fraud</div>
            <h4 className="text-base font-bold text-gray-900">KYC & Biometric Bypass</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Automated spoof attacks compromise banking telephone trees, bypassing static voicepassphrase matchers.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: HOW IT WORKS PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-[11px] font-mono text-gray-900 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-gray-900" />
            <span>Interactive 3D Pipeline</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">How VoiceShield AI Works</h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Explore the multi-layer neural architecture from voice capture to deterministic enforcement.
          </p>
        </div>

        <Pipeline3DVisualizer />
      </section>

      {/* 5. SECTION 4: WHY VOICESHIELD AI? (8 PILLARS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Why VoiceShield AI?</h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Eight architectural advantages that set VoiceShield AI apart as the enterprise standard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { num: '01', title: 'Real-Time Detection', desc: 'Continuous sliding 3.0s window analysis under 100ms latency.' },
            { num: '02', title: 'AI-Powered Analysis', desc: '6-model ensemble including Champion LFCC LCNN (AUC 0.94).' },
            { num: '03', title: 'Deepfake Detection', desc: 'Identifies neural vocoder phase artifacts and sinc filter residuals.' },
            { num: '04', title: 'Voice Clone Detection', desc: 'Detects cross-speaker acoustic cloning and synthetic prosody.' },
            { num: '05', title: 'Explainable Results', desc: 'Provides forensic proof with acoustic radar and signal indicators.' },
            { num: '06', title: 'Enterprise Security', desc: 'Zero audio retention, AES-256 encryption, and on-prem air-gap.' },
            { num: '07', title: 'Forensic Analysis', desc: 'Physical vocal cord modeling (jitter, shimmer, F0 micro-tremors).' },
            { num: '08', title: 'Actionable Decisions', desc: 'Deterministic ALLOW, REVIEW, and BLOCK policy enforcement.' },
          ].map((pillar) => (
            <div key={pillar.num} className="glass-card p-5 space-y-2">
              <span className="text-xs font-mono font-bold text-gray-900">{pillar.num}.</span>
              <h4 className="text-sm font-bold text-gray-900">{pillar.title}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. SECTION 5: WHO USES VOICESHIELD AI? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Built for High-Stakes Operations</h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Trusted by security professionals across banking, telecom, and government sectors.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Landmark, name: 'Banks & Fintech' },
            { icon: Building, name: 'Insurance Groups' },
            { icon: Radio, name: 'Telecom Carriers' },
            { icon: Users, name: 'Call Centers' },
            { icon: Shield, name: 'Cybersecurity SOC' },
            { icon: Scale, name: 'Fraud Investigators' },
            { icon: Lock, name: 'Government Security' },
            { icon: Cpu, name: 'Enterprise IT' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="glass-card p-6 flex flex-col items-center justify-center text-center space-y-3 glass-card-hover">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-900 font-mono">{item.name}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

