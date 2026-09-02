/**
 * VoiceShield Design Tokens - Pure White Theme
 * Central source of truth for all design system values
 * Used for consistency across components, themes, and styles
 */

// Color Palette - Pure White Theme
export const COLORS = {
  // Backgrounds - White & Light Grays
  bg: {
    primary: '#FFFFFF',
    secondary: '#FAFBFC',
    tertiary: '#F5F7F9',
    card: '#FFFFFF',
    cardHover: '#FAFBFC',
    muted: '#F5F7F9',
  },

  // Text - Dark for Maximum Contrast & Readability
  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
    light: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Primary Accents - Neutral Grays
  blue: '#1F2937',
  cyan: '#111827',
  indigo: '#1F2937',
  purple: '#374151',

  // Status Colors - Vibrant & Clear
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  error: '#991B1B',
  info: '#0284C7',

  // Borders & Dividers - Subtle Gray
  border: '#D1D5DB',
  borderLight: '#E5E7EB',
  divider: '#E5E7EB',

  // Overlays - Very Light Gray
  overlay: 'rgba(17, 24, 39, 0.05)',
  overlayDark: 'rgba(17, 24, 39, 0.1)',
  overlayDarker: 'rgba(17, 24, 39, 0.15)',

  // For backgrounds
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Spacing System (8px base)
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    primary: '"Inter", "Manrope", "Segoe UI", system-ui, sans-serif',
    mono: '"Fira Code", "Monaco", monospace',
  },

  fontSize: {
    xs: { size: '12px', lineHeight: '16px' },
    sm: { size: '14px', lineHeight: '20px' },
    base: { size: '16px', lineHeight: '24px' },
    lg: { size: '18px', lineHeight: '28px' },
    xl: { size: '20px', lineHeight: '28px' },
    '2xl': { size: '24px', lineHeight: '32px' },
    '3xl': { size: '30px', lineHeight: '36px' },
    '4xl': { size: '36px', lineHeight: '44px' },
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  letterSpacing: {
    tight: '-0.5px',
    normal: '0px',
    wide: '0.5px',
  },
} as const;

// Border Radius
export const BORDER_RADIUS = {
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

// Shadows
export const SHADOWS = {
  xs: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  base: '0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
  '2xl': '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
  
  // Glow Effects
  glowBlue: '0 0 20px rgba(37, 99, 235, 0.15)',
  glowCyan: '0 0 20px rgba(6, 182, 212, 0.15)',
  glowSuccess: '0 0 20px rgba(16, 185, 129, 0.15)',
  glowDanger: '0 0 20px rgba(239, 68, 68, 0.15)',
} as const;

// Transitions & Animations
export const TRANSITIONS = {
  duration: {
    fast: '150ms',
    base: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
  },
} as const;

// Breakpoints
export const BREAKPOINTS = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Z-Index Levels
export const Z_INDEX = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backdrop: 1040,
  offcanvas: 1050,
  modal: 1060,
  popover: 1070,
  tooltip: 1080,
  notification: 1090,
} as const;

// Component Sizes
export const SIZES = {
  button: {
    xs: { padding: '4px 8px', fontSize: '12px', height: '24px' },
    sm: { padding: '6px 12px', fontSize: '14px', height: '32px' },
    md: { padding: '8px 16px', fontSize: '14px', height: '40px' },
    lg: { padding: '12px 24px', fontSize: '16px', height: '48px' },
    xl: { padding: '16px 32px', fontSize: '18px', height: '56px' },
  },

  input: {
    sm: { padding: '6px 12px', fontSize: '14px', height: '32px' },
    md: { padding: '8px 12px', fontSize: '14px', height: '40px' },
    lg: { padding: '12px 16px', fontSize: '16px', height: '48px' },
  },

  badge: {
    sm: { padding: '2px 8px', fontSize: '12px' },
    md: { padding: '4px 12px', fontSize: '13px' },
    lg: { padding: '6px 16px', fontSize: '14px' },
  },

  icon: {
    xs: '16px',
    sm: '20px',
    md: '24px',
    lg: '32px',
    xl: '48px',
  },
} as const;

// Component-Specific Tokens

export const BUTTON_STYLES = {
  primary: {
    bg: COLORS.blue,
    text: COLORS.text.inverse,
    hover: '#1D4ED8',
    active: '#1E40AF',
    disabled: {
      bg: COLORS.bg.tertiary,
      text: COLORS.text.muted,
    },
  },
  secondary: {
    bg: COLORS.bg.secondary,
    text: COLORS.text.primary,
    hover: COLORS.bg.tertiary,
    active: COLORS.border,
    disabled: {
      bg: COLORS.bg.tertiary,
      text: COLORS.text.muted,
    },
  },
  danger: {
    bg: COLORS.danger,
    text: COLORS.text.inverse,
    hover: '#DC2626',
    active: '#B91C1C',
    disabled: {
      bg: COLORS.bg.tertiary,
      text: COLORS.text.muted,
    },
  },
} as const;

export const CARD_STYLES = {
  default: {
    bg: COLORS.bg.card,
    border: COLORS.border,
    shadow: SHADOWS.base,
    hover: SHADOWS.md,
  },
  elevated: {
    bg: COLORS.bg.card,
    border: COLORS.borderLight,
    shadow: SHADOWS.lg,
    hover: SHADOWS.xl,
  },
  outlined: {
    bg: COLORS.bg.primary,
    border: COLORS.border,
    shadow: 'none',
  },
} as const;

export const INPUT_STYLES = {
  default: {
    bg: COLORS.bg.card,
    border: COLORS.border,
    text: COLORS.text.primary,
    placeholder: COLORS.text.muted,
    focus: {
      border: COLORS.blue,
      shadow: `0 0 0 3px ${COLORS.overlay}`,
    },
  },
  error: {
    border: COLORS.danger,
    focus: {
      border: COLORS.danger,
      shadow: `0 0 0 3px rgba(239, 68, 68, 0.1)`,
    },
  },
} as const;

// Status Indicator Colors
export const STATUS_COLORS = {
  authentic: COLORS.success,
  synthetic: COLORS.danger,
  uncertain: COLORS.warning,
  processing: COLORS.blue,
  error: COLORS.danger,
} as const;

// Risk Score Color Mapping
export const RISK_SCORE_COLORS = {
  safe: { bg: '#D1FAE5', text: '#065F46', accent: COLORS.success }, // Green
  medium: { bg: '#FEF3C7', text: '#78350F', accent: COLORS.warning }, // Amber
  high: { bg: '#FEE2E2', text: '#7F1D1D', accent: COLORS.danger }, // Red
} as const;

// Opacity Levels
export const OPACITY = {
  0: '0',
  5: '0.05',
  10: '0.1',
  20: '0.2',
  30: '0.3',
  40: '0.4',
  50: '0.5',
  60: '0.6',
  70: '0.7',
  80: '0.8',
  90: '0.9',
  100: '1',
} as const;

// Animation Keyframes
export const ANIMATIONS = {
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  slideInUp: {
    from: { transform: 'translateY(10px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  slideInDown: {
    from: { transform: 'translateY(-10px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-1000px 0' },
    '100%': { backgroundPosition: '1000px 0' },
  },
} as const;
