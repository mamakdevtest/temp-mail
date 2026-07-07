/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
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
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glow-blue': '0 12px 30px rgba(59,130,255,0.28)',
        'glow-cyan': '0 10px 26px rgba(52,215,255,0.2)',
        'card': '0 20px 60px rgba(2,8,23,0.45), inset 0 1px 0 rgba(255,255,255,0.03)',
        'panel': '0 25px 80px rgba(3,10,28,0.55)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float-soft': 'floatSoft 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        glow: { from: { boxShadow: '0 0 5px rgba(59,130,255,0.2)' }, to: { boxShadow: '0 0 18px rgba(59,130,255,0.4)' } },
        floatSoft: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
      },
    },
  },
  plugins: [],
};
