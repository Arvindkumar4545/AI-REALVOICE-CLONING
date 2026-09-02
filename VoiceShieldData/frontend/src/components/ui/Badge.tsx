/**
 * Badge Component
 * Display status and tag badges
 */

import React from 'react';
import { getBadgeClasses } from '../../theme/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  children,
  ...props
}) => {
  const baseClasses = getBadgeClasses(variant, size);

  return (
    <span className={`${baseClasses} ${className}`.trim()} {...props}>
      {icon && iconPosition === 'left' && <span className="mr-1">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-1">{icon}</span>}
    </span>
  );
};

Badge.displayName = 'Badge';

// Status badge component
interface StatusBadgeProps {
  status: 'authentic' | 'synthetic' | 'uncertain' | 'processing';
  icon?: React.ReactNode;
  text?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, icon, text, className = '' }) => {
  const statusConfig = {
    authentic: { bg: 'bg-green-100', text: 'text-green-700', label: 'Authentic' },
    synthetic: { bg: 'bg-red-100', text: 'text-red-700', label: 'Synthetic' },
    uncertain: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Uncertain' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-full ${config.bg} ${config.text} ${className}`.trim()}>
      {icon}
      {text || config.label}
    </div>
  );
};
