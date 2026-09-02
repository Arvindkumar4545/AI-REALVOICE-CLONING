import React from 'react';
import { Link } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  Server,
  FileCheck,
  EyeOff,
  Cpu,
  Key,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { CyberSecurityShield3D } from '../three/CyberSecurityShield3D';

export const SecurityPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16 cyber-grid-bg">
      {/* Header with 3D Shield */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.30)] text-xs font-mono text-[#10B981] font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Enterprise Security & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Security by Design. Zero Voice Retention.
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
            VoiceShield AI is built from the ground up for strict enterprise data sovereignty, privacy compliance, and impenetrable cryptographic assurance.
          </p>
        </div>

        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="w-full max-w-sm h-72 relative">
            <CyberSecurityShield3D />
          </div>
        </div>
      </div>

      {/* 4 Pillars of Voice Security */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 w-fit">
            <EyeOff className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">Zero Raw Audio Storage</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Audio tensors are extracted into memory, evaluated across neural models, and discarded immediately. No voice recording or PII is ever persisted to disk.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#3B82F6] w-fit">
            <Key className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">AES-256-GCM & TLS 1.3</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            All telemetry, API communications, and WebRTC streaming buffers utilize enterprise-grade encryption in transit and cryptographic authentication.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#6366F1] w-fit">
            <Server className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">On-Prem Air-Gapped</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Deployable via self-contained Docker/Kubernetes clusters inside completely isolated, air-gapped financial banking data centers.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-[#10B981] w-fit">
            <FileCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-gray-900">SOC 2 & GDPR Aligned</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            Meets stringent regulatory frameworks for voice privacy, auditability, role-based access control (RBAC), and compliance logging.
          </p>
        </div>
      </div>

      {/* Compliance Checklist */}
      <div className="glass-panel p-8 rounded-3xl border border-gray-200 space-y-6">
        <h3 className="text-lg font-bold text-gray-900 font-mono uppercase tracking-wider">
          Enterprise Security Verification Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            'Ephemeral memory-only audio buffer processing with instant memory purge',
            'Granular Role-Based Access Control (RBAC) with MFA enforcement',
            'Immutable SHA-256 cryptographic audit logs for every inspection event',
            'Continuous automated model drift & adversarial evasion monitoring',
            'Dedicated enterprise VPC & sovereign on-premises air-gap deployment options',
            'Annual third-party penetration testing and vulnerability assessments',
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] mt-0.5 flex-shrink-0" />
              <span className="text-gray-600 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
