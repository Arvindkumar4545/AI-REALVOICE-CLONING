import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
  glow?: 'cyan' | 'blue' | 'purple' | 'emerald' | 'amber' | 'danger' | 'none';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  elevated = false,
  interactive = false,
  glow = 'none',
  onClick,
}) => {
  const baseClass = elevated ? 'glass-card-elevated' : 'glass-card';
  const interactiveClass = interactive ? 'glass-card-hover cursor-pointer' : '';
  
  const glowClass = {
    'cyan': 'glow-cyan',
    'blue': 'glow-blue',
    'purple': 'glow-purple',
    'emerald': 'glow-emerald',
    'amber': 'glow-amber',
    'danger': 'glow-danger',
    'none': '',
  }[glow];

  return (
    <div
      onClick={onClick}
      className={`${baseClass} ${interactiveClass} ${glowClass} ${className}`}
    >
      {children}
    </div>
  );
};
