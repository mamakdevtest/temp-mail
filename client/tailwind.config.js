/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#07111F',
          surface: '#0E1B30',
          surface2: '#11203A',
          surface3: '#162744',
          border: '#1C3050',
          border2: '#243B5C',
        },
        accent: {
          blue: '#2F80FF',
          cyan: '#30D5FF',
          teal: '#22D3C5',
          purple: '#7C5CFF',
          green: '#2DD4A8',
          red: '#FF5D62',
        },
        txt: {
          primary: '#F0F4F8',
          secondary: '#8899B0',
          muted: '#5A6E85',
          disabled: '#3A4D63',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'glow-blue': '0 0 20px rgba(47,128,255,0.15)',
        'glow-cyan': '0 0 20px rgba(48,213,255,0.12)',
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        glow: { from: { boxShadow: '0 0 5px rgba(47,128,255,0.2)' }, to: { boxShadow: '0 0 15px rgba(47,128,255,0.4)' } },
      },
    },
  },
  plugins: [],
};
