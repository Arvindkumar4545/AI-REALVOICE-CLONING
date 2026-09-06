import React from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  className?: string;
  accentColor?: 'cyan' | 'emerald' | 'amber' | 'purple' | 'blue';
}

const accentColors = {
  cyan: 'text-[#22D3EE]',
  emerald: 'text-[#10B981]',
  amber: 'text-[#F59E0B]',
  purple: 'text-[#A78BFA]',
  blue: 'text-[#3B82F6]',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  unit,
  description,
  className = '',
  accentColor = 'cyan',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`glass-card p-6 space-y-2 border border-[rgba(226,232,240,0.10)] ${className}`}
    >
      <div className="text-xs font-sans text-slate-500 font-medium tracking-wide uppercase">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-black font-mono ${accentColors[accentColor]}`}>{value}</span>
        {unit && <span className="text-xs font-sans font-medium text-slate-500">{unit}</span>}
      </div>
      {description && <p className="text-xs text-slate-500 pt-1 font-sans leading-relaxed">{description}</p>}
    </motion.div>
  );
};
