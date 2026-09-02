import React, { useState } from 'react';
import { Mic, Waves, Cpu, Sparkles, Sliders, ShieldCheck } from 'lucide-react';

const PIPELINE_STEPS = [
  {
    step: 1,
    title: '1. Voice Capture',
    subtitle: '16 kHz Mono Standard',
    desc: 'Audio received via SIP trunk, WebRTC, or uploaded audio. Real-time VAD isolates active speech.',
    icon: Mic,
    color: 'border-[#06B6D4] text-[#06B6D4]',
    tech: 'WebAudio / PyAV / VAD',
  },
  {
    step: 2,
    title: '2. Signal Processing',
    subtitle: 'Spectral Windowing',
    desc: 'Standardized 3.0-second continuous windows with 1.5-second overlap without destructive silence stripping.',
    icon: Waves,
    color: 'border-[#3B82F6] text-[#3B82F6]',
    tech: 'STFT / Windowing / Pre-emphasis',
  },
  {
    step: 3,
    title: '3. Feature Extraction',
    subtitle: 'Multi-Domain Vectors',
    desc: 'Extracts 3-channel LFCC (static + delta + delta-delta), 8D prosodic contours (F0, energy, jitter, shimmer), and Mel-filterbanks.',
    icon: Sliders,
    color: 'border-[#6366F1] text-[#6366F1]',
    tech: 'LFCC (20-coef) / PyIN / Mel',
  },
  {
    step: 4,
    title: '4. Neural Models',
    subtitle: 'Multi-Model Consensus',
    desc: 'Evaluated simultaneously across Champion LCNN (AUC 0.9401), BiLSTM Prosody (AUC 0.8547), WavLM, and RawNet2.',
    icon: Cpu,
    color: 'border-[#3B82F6] text-[#3B82F6]',
    tech: 'LCNN / BiLSTM / WavLM / ECAPA',
  },
  {
    step: 5,
    title: '5. Risk Engine',
    subtitle: 'Learned Stacking Fusion',
    desc: 'Regularized logistic stacking computes calibrated posterior probabilities with empirical temperature scaling.',
    icon: Sparkles,
    color: 'border-[#F59E0B] text-[#F59E0B]',
    tech: 'Isotonic / Platt / Logit Stacking',
  },
  {
    step: 6,
    title: '6. Enforcement',
    subtitle: 'ALLOW / REVIEW / BLOCK',
    desc: 'Instant 3-state deterministic verdict with forensic explanation notes returned under 500 ms.',
    icon: ShieldCheck,
    color: 'border-[#10B981] text-[#10B981]',
    tech: 'Policy Engine / SIP Drop Webhooks',
  },
];

export const Pipeline3DVisualizer: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);

  return (
    <div className="w-full space-y-6">
      {/* Horizontal Step Timeline on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STEPS.map((item) => {
          const Icon = item.icon;
          const isSelected = activeStep === item.step;
          return (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-4 rounded-2xl text-left transition-all duration-300 relative overflow-hidden ${
                isSelected
                  ? 'bg-[#101F35] border-2 border-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                  : 'bg-[#0B1628] border border-[rgba(56,189,248,0.12)] hover:border-[#22D3EE]/40 hover:bg-[#101F35]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[#94A3B8]">Step 0{item.step}</span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#22D3EE]' : 'text-[#94A3B8]'}`} />
              </div>
              <h5 className="text-xs font-bold text-[#F8FAFC] mb-0.5">{item.title.split('. ')[1]}</h5>
              <p className="text-[10px] font-mono text-[#CBD5E1] truncate">{item.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Detailed Active Step Focus Panel */}
      {(() => {
        const current = PIPELINE_STEPS.find((s) => s.step === activeStep) || PIPELINE_STEPS[0];
        const Icon = current.icon;
        return (
          <div className="glass-panel p-6 rounded-2xl border border-[rgba(56,189,248,0.14)] bg-[#0B1628]/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.30)] text-[11px] font-mono text-[#22D3EE] font-semibold">
                <Icon className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Forensic Architecture Flow — {current.title}</span>
              </div>
              <h4 className="text-lg font-bold text-[#F8FAFC]">{current.subtitle}</h4>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">{current.desc}</p>
            </div>

            <div className="px-5 py-3 rounded-xl bg-[#071426] border border-[rgba(56,189,248,0.12)] font-mono text-xs text-right space-y-1">
              <span className="text-[10px] uppercase text-[#94A3B8] block font-semibold">Subsystem Stack</span>
              <span className="text-[#22D3EE] font-bold block">{current.tech}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
