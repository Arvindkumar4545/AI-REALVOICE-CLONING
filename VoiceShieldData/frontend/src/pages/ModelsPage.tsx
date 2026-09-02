import React from 'react';
import {
  Cpu,
  CheckCircle,
} from 'lucide-react';

const MODELS = [
  {
    name: 'LCNN (Lightweight CNN)',
    version: 'v2.0.0-champion',
    type: 'Spectral Phase & LFCC',
    auc: '0.9401',
    eer: '12.83%',
    recall: '90.3%',
    stackingWeight: '0.4813',
    latency: '82 ms',
    status: 'CHAMPION / PRODUCTION',
    desc: '3-channel static, delta, and delta-delta LFCC filterbanks with max-feature-map activation. Primary detector for vocoder phase artifacts.',
    features: ['LFCC 20 Static Coefs', 'Delta & Delta-Delta Channels', 'Max-Feature-Map (MFM) Activation'],
  },
  {
    name: 'BiLSTM Prosody Engine',
    version: 'v2.0.0-champion',
    type: 'Acoustic Prosody & Pitch Dynamics',
    auc: '0.8547',
    eer: '32.33%',
    recall: '67.0%',
    stackingWeight: '0.4545',
    latency: '45 ms',
    status: 'ACTIVE / PRODUCTION',
    desc: 'Bidirectional recurrent network analyzing temporal pitch dynamics, vocal jitter, shimmer, and physical vocal cord micro-tremors.',
    features: ['PyIN F0 Tracking', 'Log-Energy & Delta Contours', 'Vocal Micro-Tremor Modeling'],
  },
  {
    name: 'WavLM Representation Head',
    version: 'v2.0.0-champion',
    type: 'Self-Supervised Transformer',
    auc: '0.7817',
    eer: '30.83%',
    recall: '34.0%',
    stackingWeight: '0.0150',
    latency: '160 ms',
    status: 'ACTIVE / ENSEMBLE',
    desc: 'Self-supervised acoustic representation model trained on masked speech reconstruction to expose synthetic phonetic transitions.',
    features: ['Phonetic Context Modeling', 'Masked Transformer Layers', 'Adversarial Evasion Defense'],
  },
  {
    name: 'RawNet2 Sinc Network',
    version: 'v1.4.2-calibrated',
    type: 'Raw Waveform Domain',
    auc: '0.5990',
    eer: '38.17%',
    recall: '96.7%',
    stackingWeight: '0.0491',
    latency: '68 ms',
    status: 'ACTIVE / ENSEMBLE',
    desc: 'End-to-end raw audio waveform architecture using parameterized sinc filters to capture high-frequency band anomalies.',
    features: ['Parametric Sinc-Convolutions', 'Residual Feature Maps', 'Zero-Preconditioning Ingestion'],
  },
  {
    name: 'ECAPA-TDNN Speaker Biometrics',
    version: 'v1.2.0-production',
    type: '192-D Acoustic Embeddings',
    auc: '0.9820',
    eer: '1.80%',
    recall: '98.2%',
    stackingWeight: 'Biometric Gate',
    latency: '52 ms',
    status: 'ACTIVE / BIOMETRICS',
    desc: 'Emphasized channel attention TDNN producing 192-dimensional speaker embeddings for real-time voiceprint matching.',
    features: ['Squeeze-and-Excitation Layers', 'Channel Attention Mechanisms', 'A-Softmax Loss Calibration'],
  },
];

export const ModelsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-[11px] font-mono text-gray-900 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-gray-900" />
            <span>AI Model Registry & Performance Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            NEURAL SUB-MODEL ENSEMBLE REGISTRY
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Empirically benchmarked deep learning models powering VoiceShield AI multi-model consensus fusion.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.30)] text-[#10B981] text-xs font-mono font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Champion Checkpoint v2.0 Active</span>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {MODELS.map((m, idx) => (
          <div key={idx} className="glass-card p-6 space-y-5 glass-card-hover">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-gray-900 font-bold uppercase tracking-widest block">{m.type}</span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">{m.name}</h3>
                <span className="text-xs text-[#64748B] font-mono">{m.version}</span>
              </div>

              <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-900 font-bold">
                {m.status}
              </span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">{m.desc}</p>

            {/* Metrics Strip */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[9px] text-[#64748B] uppercase block font-semibold">AUC Score</span>
                <span className="font-bold text-[#10B981] mt-0.5 block">{m.auc}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[9px] text-[#64748B] uppercase block font-semibold">Equal Error</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{m.eer}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[9px] text-[#64748B] uppercase block font-semibold">Stack Weight</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{m.stackingWeight}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[9px] text-[#64748B] uppercase block font-semibold">Latency</span>
                <span className="font-bold text-gray-900 mt-0.5 block">{m.latency}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 space-y-1">
              {m.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-gray-900" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
