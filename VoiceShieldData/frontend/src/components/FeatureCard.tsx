import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details?: string[];
  className?: string;
  onClick?: () => void;
  accentColor?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'purple';
}

const accentColors = {
  cyan: { text: 'text-[#22D3EE]', bg: 'bg-[rgba(34,211,238,0.08)]', border: 'border-[rgba(34,211,238,0.3)]' },
  blue: { text: 'text-[#3B82F6]', bg: 'bg-[rgba(59,130,246,0.08)]', border: 'border-[rgba(59,130,246,0.3)]' },
  emerald: { text: 'text-[#10B981]', bg: 'bg-[rgba(16,185,129,0.08)]', border: 'border-[rgba(16,185,129,0.3)]' },
  amber: { text: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.08)]', border: 'border-[rgba(245,158,11,0.3)]' },
  purple: { text: 'text-[#A78BFA]', bg: 'bg-[rgba(167,139,250,0.08)]', border: 'border-[rgba(167,139,250,0.3)]' },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  details,
  className = '',
  onClick,
  accentColor = 'cyan',
}) => {
  const colors = accentColors[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
      className={`glass-card p-6 space-y-4 cursor-pointer group border border-[rgba(226,232,240,0.10)] hover:border-[rgba(226,232,240,0.20)] transition-all ${className}`}
    >
      <div className={`p-3 rounded-lg w-fit ${colors.bg} ${colors.border} border group-hover:scale-110 transition-transform`}>
        <Icon className={`w-6 h-6 ${colors.text}`} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[#F8FAFC] group-hover:text-[#E2E8F0] transition-colors">{title}</h3>
        <p className="text-xs text-[#94A3B8] leading-relaxed">{description}</p>
      </div>

      {details && details.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[rgba(226,232,240,0.10)]">
          {details.map((detail, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#64748B]">
              <span className={`${colors.text} font-bold flex-shrink-0 mt-0.5`}>→</span>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
