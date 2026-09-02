import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, Terminal, Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[rgba(226,232,240,0.08)] bg-[#030712]/80 backdrop-blur-sm text-slate-100 text-xs mt-24 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-[radial-gradient(circle,rgba(34,211,238,0.08)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 relative z-10">
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E2E8F0] to-[#CBD5E1] p-0.5 shadow-[0_0_20px_rgba(226,232,240,0.2)]">
                <div className="w-full h-full bg-[#030712] rounded-[6px] flex items-center justify-center">
                  <Shield className="w-4 h-4 text-[#E2E8F0]" />
                </div>
              </div>
              <span className="text-sm font-black tracking-wider text-[#F8FAFC]">VOICE SHIELD AI</span>
            </div>
            <p className="text-[#CBD5E1] text-xs leading-relaxed max-w-sm">
              Enterprise-grade real-time voice authenticity verification. Detects deepfakes, voice clones, and synthetic speech across mission-critical communications.
            </p>
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8]">
              <span className="flex items-center gap-1 text-[#CBD5E1]"><Lock className="w-3 h-3 text-[#10B981]" /> AES-256</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#CBD5E1]"><Terminal className="w-3 h-3 text-[#22D3EE]" /> Zero Logs</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#CBD5E1]"><Activity className="w-3 h-3 text-[#10B981]" /> 99.2% AUC</span>
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-3">
            <h5 className="text-[#E2E8F0] font-mono font-bold text-xs uppercase tracking-wider">Product</h5>
            <ul className="space-y-2">
              <li><Link to="/detect" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Voice Inspector</Link></li>
              <li><Link to="/voiceprints" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Voiceprints</Link></li>
              <li><Link to="/calls" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Calls</Link></li>
              <li><Link to="/threats" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Threats</Link></li>
              <li><Link to="/models" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Models</Link></li>
              <li><Link to="/policies" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Policies</Link></li>
            </ul>
          </div>

          {/* Solutions & Resources Col */}
          <div className="space-y-3">
            <h5 className="text-[#E2E8F0] font-mono font-bold text-xs uppercase tracking-wider">Resources</h5>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">About</Link></li>
              <li><Link to="/how-it-works" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">How It Works</Link></li>
              <li><Link to="/features" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Features</Link></li>
              <li><Link to="/security" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Security</Link></li>
              <li><Link to="/use-cases" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Use Cases</Link></li>
              <li><Link to="/audit-log" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Audit Log</Link></li>
            </ul>
          </div>

          {/* Company & Legal Col */}
          <div className="space-y-3">
            <h5 className="text-[#E2E8F0] font-mono font-bold text-xs uppercase tracking-wider">Company</h5>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Privacy</Link></li>
              <li><Link to="/report" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Report Scam</Link></li>
              <li><Link to="/dashboard" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Dashboard</Link></li>
              <li><Link to="/signin" className="text-[#94A3B8] hover:text-[#E2E8F0] transition-colors">Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[rgba(226,232,240,0.08)] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-[#94A3B8] relative z-10">
          <p>© {new Date().getFullYear()} VoiceShield AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-[#CBD5E1]">SOC 2 Type II</span>
            <span>•</span>
            <span className="text-[#CBD5E1]">GDPR / HIPAA</span>
            <span>•</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              24/7 Operations
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
