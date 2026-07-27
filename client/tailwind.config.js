/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'rgb(var(--brand-bg) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface) / <alpha-value>)',
          surface2: 'rgb(var(--brand-surface2) / <alpha-value>)',
          surface3: 'rgb(var(--brand-surface3) / <alpha-value>)',
          border: 'rgb(var(--brand-border) / <alpha-value>)',
          border2: 'rgb(var(--brand-border2) / <alpha-value>)',
        },
        accent: {
          blue: 'rgb(var(--accent-blue) / <alpha-value>)',
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          teal: 'rgb(var(--accent-teal) / <alpha-value>)',
          purple: 'rgb(var(--accent-purple) / <alpha-value>)',
          green: 'rgb(var(--accent-green) / <alpha-value>)',
          red: 'rgb(var(--accent-red) / <alpha-value>)',
          gold: 'rgb(var(--accent-gold) / <alpha-value>)',
        },
        txt: {
          primary: 'rgb(var(--txt-primary) / <alpha-value>)',
          secondary: 'rgb(var(--txt-secondary) / <alpha-value>)',
          muted: 'rgb(var(--txt-muted) / <alpha-value>)',
          disabled: 'rgb(var(--txt-disabled) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '16px',
      },
      boxShadow: {
        'glow-blue': 'var(--shadow-glow)',
        'glow-cyan': 'var(--shadow-glow)',
        'card': 'var(--shadow-md)',
        'panel': 'var(--shadow-lg)',
      },
      animation: {
        'fade-in': 'fadeIn var(--dur-2) var(--ease)',
        'slide-up': 'slideUp var(--dur-2) var(--ease)',
        'slide-down': 'slideDown var(--dur-2) var(--ease)',
        'pop-in': 'popIn var(--dur-2) var(--ease-spring)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        popIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
};
