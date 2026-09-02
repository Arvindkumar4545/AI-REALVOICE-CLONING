import React from 'react';
import { Shield, Sparkles } from 'lucide-react';

interface WebGLFallbackProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export const WebGLFallback: React.FC<WebGLFallbackProps> = ({
  className = 'w-full h-80',
  title = 'AI Voice Security Core',
  subtitle = 'Digital Forensic Neural Network Active',
}) => {
  return (
    <div className={`glass-panel rounded-2xl border border-[#16324A] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-[#0B1628] ${className}`}>
      {/* Animated glowing rings */}
      <div className="relative w-40 h-40 flex items-center justify-center my-4">
        <div className="absolute inset-0 rounded-full border border-[#06B6D4]/30 animate-ping opacity-25" />
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#06B6D4]/40 animate-spin" style={{ animationDuration: '15s' }} />
        <div className="absolute inset-6 rounded-full border border-[#6366F1]/30 animate-pulse" />
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#06B6D4] to-[#3B82F6] border border-[#06B6D4] flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.35)]">
          <Shield className="w-9 h-9 text-white" />
        </div>
      </div>

      <div className="space-y-1 z-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#06B6D4] font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>{title}</span>
        </div>
        <p className="text-xs text-[#94A3B8] max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
};
