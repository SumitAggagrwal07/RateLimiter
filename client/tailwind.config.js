/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0F172A',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
        },
        crimson: {
          400: '#F87171',
          500: '#EF4444',
        },
      },
      animation: {
        'pulse-fast': 'pulse 0.75s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #10B981, 0 0 20px #10B981' },
          '100%': { boxShadow: '0 0 10px #10B981, 0 0 40px #10B981, 0 0 80px #10B981' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
