import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityBadgeProps {
  icon: LucideIcon;
  label: string;
  description?: string;
  status?: 'active' | 'warning' | 'critical' | 'safe';
  className?: string;
}

export const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  icon: Icon,
  label,
  description,
  status = 'active',
  className = '',
}) => {
  const statusConfig = {
    active: { bg: 'bg-[rgba(16,185,129,0.08)]', border: 'border-[rgba(16,185,129,0.3)]', text: 'text-[#10B981]', dot: 'bg-[#10B981]' },
    warning: { bg: 'bg-[rgba(245,158,11,0.08)]', border: 'border-[rgba(245,158,11,0.3)]', text: 'text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
    critical: { bg: 'bg-[rgba(239,68,68,0.08)]', border: 'border-[rgba(239,68,68,0.3)]', text: 'text-[#EF4444]', dot: 'bg-[#EF4444]' },
    safe: { bg: 'bg-[rgba(34,211,238,0.08)]', border: 'border-[rgba(34,211,238,0.3)]', text: 'text-[#22D3EE]', dot: 'bg-[#22D3EE]' },
  };

  const config = statusConfig[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`${config.bg} ${config.border} border rounded-xl p-3 space-y-2 ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg bg-[rgba(3,7,18,0.8)] ${config.text}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className={`text-xs font-bold font-mono uppercase ${config.text}`}>{label}</span>
        <div className={`w-2 h-2 rounded-full ${config.dot} ml-auto ${status === 'active' ? 'animate-pulse' : ''}`} />
      </div>
      {description && <p className="text-[11px] text-[#94A3B8] font-mono leading-relaxed">{description}</p>}
    </motion.div>
  );
};
