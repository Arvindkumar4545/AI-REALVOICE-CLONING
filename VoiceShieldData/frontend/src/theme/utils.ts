/**
 * Design System Utilities
 * Helper functions for consistent styling and component composition
 */

import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TRANSITIONS } from './tokens';
import clsx from 'clsx';

/**
 * Combines multiple class names intelligently
 */
export const cn = clsx;

/**
 * Build consistent button styles - Pure White Theme
 */
export const getButtonClasses = (
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' = 'primary',
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md',
  isDisabled: boolean = false
): string => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const variantClasses = {
    primary: isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 focus-visible:ring-gray-400 shadow-md hover:shadow-lg',
    secondary: isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 focus-visible:ring-gray-400 border border-gray-300',
    danger: isDisabled
      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
      : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400 shadow-md hover:shadow-lg',
    ghost: isDisabled
      ? 'text-gray-400 cursor-not-allowed'
      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-400',
  };

  return cn(baseClasses, sizeClasses[size], variantClasses[variant]);
};

/**
 * Build consistent card styles - Pure White Theme
 */
export const getCardClasses = (
  variant: 'default' | 'elevated' | 'outlined' = 'default',
  isHoverable: boolean = false
): string => {
  const baseClasses = 'rounded-lg transition-all duration-200';

  const variantClasses = {
    default: `bg-white border border-gray-200 ${SHADOWS.base}`,
    elevated: `bg-white border border-gray-100 ${SHADOWS.lg}`,
    outlined: 'bg-white border-2 border-gray-300',
  };

  const hoverClasses = isHoverable
    ? 'hover:shadow-lg hover:border-gray-400 cursor-pointer'
    : '';

  return cn(baseClasses, variantClasses[variant], hoverClasses);
};

/**
 * Build consistent input styles - Pure White Theme
 */
export const getInputClasses = (
  size: 'sm' | 'md' | 'lg' = 'md',
  isError: boolean = false,
  isDisabled: boolean = false
): string => {
  const baseClasses =
    'w-full rounded-md border transition-colors duration-200 font-base focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-900';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-3 text-base',
  };

  const stateClasses = isDisabled
    ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
    : isError
      ? 'bg-white border-red-500 focus:border-red-500 focus:ring-red-200'
      : 'bg-white border-gray-300 focus:border-gray-900 focus:ring-gray-200';

  return cn(baseClasses, sizeClasses[size], stateClasses);
};

/**
 * Build consistent badge styles - Pure White Theme
 */
export const getBadgeClasses = (
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default',
  size: 'sm' | 'md' | 'lg' = 'md'
): string => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const variantClasses = {
    default: 'bg-gray-100 text-gray-700 border border-gray-300',
    success: 'bg-green-50 text-green-700 border border-green-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  return cn(baseClasses, sizeClasses[size], variantClasses[variant]);
};

/**
 * Build consistent status indicator colors - Pure White Theme
 */
export const getStatusColor = (
  status: 'authentic' | 'synthetic' | 'uncertain' | 'processing' | 'error'
): { bg: string; text: string; border: string } => {
  const statusMap = {
    authentic: {
      bg: '#ECFDF5',
      text: '#065F46',
      border: '#6EE7B7',
    },
    synthetic: {
      bg: '#FEF2F2',
      text: '#7F1D1D',
      border: '#FCA5A5',
    },
    uncertain: {
      bg: '#FFFBEB',
      text: '#78350F',
      border: '#FCD34D',
    },
    processing: {
      bg: '#EFF6FF',
      text: '#1E40AF',
      border: '#93C5FD',
    },
    error: {
      bg: '#FEF2F2',
      text: '#7F1D1D',
      border: '#FCA5A5',
    },
  };

  return statusMap[status];
};

/**
 * Build risk score color gradient
 */
export const getRiskScoreColor = (
  score: number
): { bg: string; text: string; accent: string } => {
  if (score <= 0.33) {
    return { bg: '#D1FAE5', text: '#065F46', accent: COLORS.success };
  } else if (score <= 0.66) {
    return { bg: '#FEF3C7', text: '#78350F', accent: COLORS.warning };
  } else {
    return { bg: '#FEE2E2', text: '#7F1D1D', accent: COLORS.danger };
  }
};

/**
 * Spacing utility - converts token to px
 */
export const spacing = (key: keyof typeof SPACING): string => {
  return SPACING[key];
};

/**
 * Create a flex layout with common patterns
 */
export const flexCenter = (): string => {
  return 'flex items-center justify-center';
};

export const flexBetween = (): string => {
  return 'flex items-center justify-between';
};

export const flexCol = (): string => {
  return 'flex flex-col';
};

/**
 * Grid layout utilities
 */
export const gridCol = (cols: number): string => {
  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
  };
  return colMap[cols] || 'grid-cols-1';
};

/**
 * Responsive text sizes
 */
export const responsiveText = (): string => {
  return 'text-sm sm:text-base md:text-lg';
};

/**
 * Create smooth transitions
 */
export const smoothTransition = (properties: string = 'all'): string => {
  return `transition-${properties} duration-${TRANSITIONS.duration.base} ease-out`;
};

/**
 * Truncate text
 */
export const truncateText = (lines: number = 1): string => {
  if (lines === 1) return 'truncate';
  return `line-clamp-${lines}`;
};

/**
 * Visually hidden but accessible
 */
export const srOnly = (): string => {
  return 'sr-only';
};

/**
 * Combine multiple condition-based classes
 */
export const conditionalClasses = (
  conditions: Record<string, boolean>
): string => {
  return Object.entries(conditions)
    .filter(([_, shouldApply]) => shouldApply)
    .map(([className]) => className)
    .join(' ');
};

/**
 * Create a gradient string for inline styles
 */
export const gradientBg = (
  direction: 'to-r' | 'to-b' | 'to-tr' = 'to-r',
  fromColor: string = COLORS.blue,
  toColor: string = COLORS.cyan
): string => {
  const directionMap = {
    'to-r': '135deg',
    'to-b': '180deg',
    'to-tr': '135deg',
  };
  return `linear-gradient(${directionMap[direction]}, ${fromColor}, ${toColor})`;
};
