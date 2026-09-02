import React from 'react';
import { Lock, Shield, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyCenterPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-10 pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 cyber-grid-bg">
      <div className="border-b border-[#16324A] pb-6 space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.30)] text-xs font-mono text-[#10B981] font-semibold">
          <Lock className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Data Sovereignty & Privacy Center</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight">
          VOICESHIELD ZERO-RETENTION POLICY
        </h1>
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          Enterprise voice confidentiality standards, ephemeral processing, and compliance transparency.
        </p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-[#16324A] space-y-6">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-[#F8FAFC]">1. Ephemeral Voice Ingestion</h3>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            VoiceShield AI strictly processes audio streams in volatile system memory (RAM). Raw audio buffers are decomposed into feature tensors (LFCC and prosody matrices), evaluated across neural inference networks, and purged from memory within milliseconds. No audio recording or caller biometric audio is saved to long-term storage or exposed to third parties.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#16324A]">
          <h3 className="text-lg font-bold text-[#F8FAFC]">2. Regulatory Compliance</h3>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            VoiceShield AI is designed to fulfill GDPR, CCPA, HIPAA, and SOC 2 Type II audit guidelines. Organizations operating in healthcare, financial services, and telecommunications retain full data sovereignty with optional on-premise air-gapped deployments.
          </p>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#16324A]">
          <h3 className="text-lg font-bold text-[#F8FAFC]">3. Cryptographic Audit Telemetry</h3>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            All system decisions generate an immutable SHA-256 hash verifying the model checkpoint, inference timestamp, and deterministic risk score without capturing or storing personal identifiable voice data.
          </p>
        </div>
      </div>
    </div>
  );
};