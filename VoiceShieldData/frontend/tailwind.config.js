/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pure White Theme - Backgrounds
        'vs-bg-primary': '#FFFFFF',
        'vs-bg-secondary': '#FAFBFC',
        'vs-bg-tertiary': '#F5F7F9',
        'vs-card': '#FFFFFF',
        'vs-card-hover': '#FAFBFC',
        
        // Text Colors - Dark for Maximum Contrast
        'vs-text-primary': '#111827',
        'vs-text-secondary': '#374151',
        'vs-text-muted': '#6B7280',
        'vs-text-light': '#9CA3AF',
        
        // Neutral Accents
        'vs-blue': '#1F2937',
        'vs-cyan': '#111827',
        'vs-indigo': '#1F2937',
        'vs-purple': '#374151',
        
        // Status Colors - Vibrant & Clear
        'vs-success': '#059669',
        'vs-warning': '#D97706',
        'vs-danger': '#DC2626',
        'vs-info': '#0284C7',
        
        // Borders & Dividers - Subtle Gray
        'vs-border': '#D1D5DB',
        'vs-border-light': '#E5E7EB',
        
        // Overlay & Shadow - Light
        'vs-overlay': 'rgba(17, 24, 39, 0.05)',
        'vs-overlay-dark': 'rgba(17, 24, 39, 0.1)',
        
        // Gray Scale
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
      },
      
      backgroundColor: {
        'vs-gradient': 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        'vs-gradient-accent': 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
      },
      
      boxShadow: {
        'vs-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'vs-base': '0 1px 3px 0 rgba(15, 23, 42, 0.1), 0 1px 2px 0 rgba(15, 23, 42, 0.06)',
        'vs-md': '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
        'vs-lg': '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
        'vs-xl': '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
        'vs-glow-blue': '0 0 20px rgba(37, 99, 235, 0.15)',
        'vs-glow-cyan': '0 0 20px rgba(6, 182, 212, 0.15)',
      },
      
      borderRadius: {
        'vs-xs': '4px',
        'vs-sm': '6px',
        'vs-md': '8px',
        'vs-lg': '12px',
        'vs-xl': '16px',
        'vs-2xl': '24px',
      },
      
      fontSize: {
        'vs-xs': ['12px', { lineHeight: '16px' }],
        'vs-sm': ['14px', { lineHeight: '20px' }],
        'vs-base': ['16px', { lineHeight: '24px' }],
        'vs-lg': ['18px', { lineHeight: '28px' }],
        'vs-xl': ['20px', { lineHeight: '28px' }],
        'vs-2xl': ['24px', { lineHeight: '32px' }],
        'vs-3xl': ['30px', { lineHeight: '36px' }],
        'vs-4xl': ['36px', { lineHeight: '44px' }],
      },
      
      spacing: {
        'vs-xs': '4px',
        'vs-sm': '8px',
        'vs-md': '12px',
        'vs-lg': '16px',
        'vs-xl': '24px',
        'vs-2xl': '32px',
        'vs-3xl': '48px',
      },
      
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(6, 182, 212, 0.4)' },
          '100%': { boxShadow: '0 0 30px rgba(37, 99, 235, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      
      transitionDuration: {
        'vs-fast': '150ms',
        'vs-base': '200ms',
        'vs-slow': '300ms',
      },
    },
  },
  plugins: [],
}
