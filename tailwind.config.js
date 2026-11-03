/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimalist Palette: Black, Red, Green, Gold, White
        noder: {
          black: '#000000',
          dark: '#080808',
          panel: '#111113',
          surface: '#18181B',
          border: '#27272A',
          white: '#FFFFFF',
          light: '#F8FAFC',
          lightPanel: '#FFFFFF',
          lightBorder: '#E2E8F0',
        },
        gold: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
        },
        primary: {
          50: '#F4F4F5',
          100: '#E4E4E7',
          200: '#D4D4D8',
          300: '#A1A1AA',
          400: '#71717A',
          500: '#52525B',
          600: '#3F3F46',
          700: '#27272A',
          800: '#18181B',
          900: '#09090B',
        },
        secondary: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
        },
        accent: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.bg-glass-dark': {
          'background': 'rgba(10, 10, 12, 0.85)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
        },
        '.bg-glass-light': {
          'background': 'rgba(255, 255, 255, 0.90)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(0, 0, 0, 0.08)',
        },
      });
    }),
  ],
};
