import React from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Waves,
  Sliders,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Pipeline3DVisualizer } from '../three/Pipeline3DVisualizer';
import { SecurityCore3D } from '../three/SecurityCore3D';

export const HowItWorksPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 cyber-grid-bg">
      {/* Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-xs font-mono text-gray-900 font-semibold">
          <Cpu className="w-3.5 h-3.5 text-gray-900" />
          <span>System Architecture & Neural Flow</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          How VoiceShield AI Detects Voice Clones
        </h1>
        <p className="text-sm text-gray-600">
          A multi-tiered forensic pipeline analyzing acoustic signal physics, neural vocoder phase artifacts, and prosodic dynamics.
        </p>
      </div>

      {/* Interactive 3D Pipeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wider">
          Interactive 6-Stage Forensic Pipeline
        </h3>
        <Pipeline3DVisualizer />
      </div>

      {/* Subsystem Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 w-fit">
            <Waves className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">1. Continuous Windowing</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Standardizes all audio inputs to 16 kHz mono float32 tensors and executes overlapping 3.0s sliding windows with 1.5s hop. Preserves natural vocal harmonics without destructive pause mutilation.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#3B82F6] w-fit">
            <Cpu className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">2. Neural Multi-Model Ensemble</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Parallel inference across 6 deep learning networks: Champion LCNN for static/delta LFCC spectral phase anomalies, BiLSTM for prosodic pitch dynamics, WavLM for phonetic context, and ECAPA for biometrics.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#10B981] w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">3. Calibrated Risk Stacking</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Learned logistic stacking weights fuse model predictions while temperature-scaled calibration maps logits directly to empirical posterior probabilities, delivering deterministic ALLOW, REVIEW, and BLOCK verdicts.
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="glass-panel p-8 rounded-3xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-[#3B82F6]/10 via-[#0B1628] to-[#3B82F6]/10">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900">Experience the forensic engine firsthand</h3>
          <p className="text-xs text-gray-600">Test sample voice files or live mic speech in the Voice Inspector workspace.</p>
        </div>
        <Link
          to="/detect"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] text-white font-bold font-mono text-xs shadow-[0_0_30px_rgba(6,182,212,0.25)] inline-flex items-center gap-2 flex-shrink-0 hover:scale-[1.02] transition-all"
        >
          <span>Launch Voice Inspector</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

