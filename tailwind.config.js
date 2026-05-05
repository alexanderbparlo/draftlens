/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          800: '#1a1f2e',
          900: '#0f1420',
          950: '#080c14',
        },
        accent: {
          DEFAULT: '#00c8b4',
          dim:     '#00a898',
          muted:   '#00c8b41a',
          border:  '#00c8b433',
        },
        // Amber is the secondary accent for DraftLens — applied to the current-year
        // draft drop zone, "Draft" badge, and variance severity highlights.
        draft: {
          DEFAULT: '#f5a623',
          dim:     '#d48f1b',
          muted:   '#f5a6231a',
          border:  '#f5a62333',
        },
        data: {
          positive: '#22d37a',
          negative: '#f05252',
          neutral:  '#8892a4',
          override: '#f5a623',
          flag:     '#f5a623',
        },
        text: {
          primary:   '#e8edf5',
          secondary: '#8892a4',
          muted:     '#4a5568',
          label:     '#6b7785',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui'],
        body:    ['var(--font-body)', 'system-ui'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'data-xl': ['1.5rem',   { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'data-lg': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'data-sm': ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.02em'  }],
        'label':   ['0.6875rem',{ lineHeight: '1.4', letterSpacing: '0.08em'  }],
      },
      borderRadius: {
        'panel': '2px',
        'card':  '4px',
        'chip':  '2px',
      },
      boxShadow: {
        'panel': '0 0 0 1px rgba(0, 200, 180, 0.12), 0 4px 24px rgba(0, 0, 0, 0.4)',
        'card':  '0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow':  '0 0 20px rgba(0, 200, 180, 0.15)',
        'glow-draft': '0 0 20px rgba(245, 166, 35, 0.18)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scan':       'scan 2s ease-in-out infinite',
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'blink':      'blink 1.2s step-end infinite',
      },
      keyframes: {
        scan:    { '0%, 100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink:   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
