import React, { useState } from 'react';
import {
  Sliders,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Save,
  CheckCircle2,
} from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const [blockThreshold, setBlockThreshold] = useState<number>(80);
  const [reviewThreshold, setReviewThreshold] = useState<number>(50);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 cyber-grid-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(6,182,212,0.08)] border border-[rgba(6,182,212,0.30)] text-[11px] font-mono text-gray-900 font-semibold">
            <Sliders className="w-3.5 h-3.5 text-gray-900" />
            <span>Policy Engine & Rule Builder</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            VOICE SECURITY ENFORCEMENT POLICIES
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Configure automated telephonic routing, threshold triggers, and deterministic risk responses.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#3B82F6] hover:from-[#2563EB] hover:to-[#2563EB] text-white font-bold font-mono text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all hover:scale-[1.02]"
        >
          <Save className="w-4 h-4" /> Save Policy Changes
        </button>
      </div>

      {saved && (
        <div className="p-4 rounded-2xl bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] text-[#10B981] text-xs flex items-center gap-2 animate-fade-in font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <span>Policy configuration successfully committed to all cluster enforcement nodes.</span>
        </div>
      )}

      {/* Interactive Threshold Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier 1: ALLOW */}
        <div className="glass-card p-6 border-[rgba(16,185,129,0.3)] space-y-4 bg-gradient-to-b from-[rgba(16,185,129,0.08)] via-[#0B1628] to-[#0B1628]">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#10B981]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.35)] text-[#10B981]">
              ALLOW
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">Low Risk Calls</h3>
            <p className="text-xs text-gray-600 font-mono">Risk Score &lt; {reviewThreshold}%</p>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Calls exhibit natural human vocal harmonics. Routed smoothly to recipient with zero delay or user friction.
          </p>

          <div className="pt-3 border-t border-gray-200 text-[11px] font-mono text-[#10B981] font-semibold">
            ? Automated Direct Connect
          </div>
        </div>

        {/* Tier 2: REVIEW */}
        <div className="glass-card p-6 border-[rgba(245,158,11,0.3)] space-y-4 bg-gradient-to-b from-[rgba(245,158,11,0.08)] via-[#0B1628] to-[#0B1628]">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#F59E0B]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.35)] text-[#F59E0B]">
              REVIEW
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">Suspicious Calls</h3>
            <p className="text-xs text-gray-600 font-mono">Risk Score between {reviewThreshold}% – {blockThreshold}%</p>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            Moderate acoustic anomalies detected. Trigger secondary MFA challenge or alert agent screen-pop.
          </p>

          <div className="pt-3 border-t border-gray-200 text-[11px] font-mono text-[#F59E0B] font-semibold">
            ? Screen-Pop Agent Alert & Liveness Check
          </div>
        </div>

        {/* Tier 3: BLOCK */}
        <div className="glass-card p-6 border-[rgba(239,68,68,0.3)] space-y-4 bg-gradient-to-b from-[rgba(239,68,68,0.08)] via-[#0B1628] to-[#0B1628]">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[#EF4444]">
              <ShieldX className="w-6 h-6" />
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.35)] text-[#EF4444]">
              BLOCK
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">Critical Deepfakes</h3>
            <p className="text-xs text-gray-600 font-mono">Risk Score &gt; {blockThreshold}%</p>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            High-confidence synthetic voice clone or vocoder artifact. Instantly terminate call or divert to forensic trap.
          </p>

          <div className="pt-3 border-t border-gray-200 text-[11px] font-mono text-[#EF4444] font-semibold">
            ?? Automated SIP Drop / Intercept Trap
          </div>
        </div>
      </div>

      {/* Threshold Configuration Box */}
      <div className="glass-panel p-8 rounded-3xl border border-gray-200 space-y-6">
        <h3 className="text-base font-bold text-gray-900 font-mono uppercase tracking-wider">
          Enforcement Threshold Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Review Threshold Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-900 font-semibold">Suspicious Review Trigger Threshold:</span>
              <span className="text-[#F59E0B] font-bold text-sm">{reviewThreshold}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="70"
              value={reviewThreshold}
              onChange={(e) => setReviewThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-50 border border-gray-200 rounded-lg appearance-none cursor-pointer accent-[#F59E0B]"
            />
            <p className="text-[11px] text-[#64748B]">Calls above this threshold require secondary verification.</p>
          </div>

          {/* Block Threshold Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-900 font-semibold">Critical Block Trigger Threshold:</span>
              <span className="text-[#EF4444] font-bold text-sm">{blockThreshold}%</span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              value={blockThreshold}
              onChange={(e) => setBlockThreshold(Number(e.target.value))}
              className="w-full h-2 bg-gray-50 border border-gray-200 rounded-lg appearance-none cursor-pointer accent-[#EF4444]"
            />
            <p className="text-[11px] text-[#64748B]">Calls above this threshold are terminated immediately.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
