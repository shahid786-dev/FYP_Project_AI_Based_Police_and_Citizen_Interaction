/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6f0ff',
          100: '#c0d5ff',
          200: '#8fb2ff',
          300: '#5e8fff',
          400: '#2d6cff',
          500: '#0049e6',
          600: '#003ab4',
          700: '#002b82',
          800: '#001c50',
          900: '#000d1f',
        },
        navy: {
          50:  '#e8eaf6',
          100: '#c5c9e7',
          200: '#9fa5d5',
          300: '#7981c3',
          400: '#5c65b5',
          500: '#3f4aa7',
          600: '#0a1628',
          700: '#071020',
          800: '#050b17',
          900: '#02060e',
          950: '#010408',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        accent: '#00d4ff',
        glass: 'rgba(255,255,255,0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #010b1a 0%, #0a1628 40%, #0d2145 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        'glow-cyan': 'radial-gradient(circle at center, rgba(0,212,255,0.15) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'typing': 'typing 1.5s steps(30,end)',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(300%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 10px rgba(0,212,255,0.3)' },
          'to': { boxShadow: '0 0 25px rgba(0,212,255,0.7), 0 0 50px rgba(0,212,255,0.3)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0,212,255,0.3)',
        'glow-blue': '0 0 20px rgba(45,108,255,0.4)',
        'glass': '0 8px 32px rgba(0,0,0,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
}
