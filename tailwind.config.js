/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '8.5': '2.125rem',
        '9.5': '2.375rem',
        '10.5': '2.625rem',
        '11.5': '2.875rem',
        '12.5': '3.125rem',
      },
      colors: {
        primary: '#3b82f6', // Premium blue 500
        primaryDark: '#2563eb', // Premium blue 600
        secondary: '#10b981', // Emerald 500
        dark: '#18181b',
        darkBg: '#09090b', // Zinc 950 for Vercel/Linear look
        darkCard: '#18181b', // Zinc 900
        blue: {
          50: 'rgba(59, 130, 246, 0.18)',
          100: 'rgba(59, 130, 246, 0.35)',
          200: 'rgba(59, 130, 246, 0.55)',
        },
        green: {
          50: 'rgba(16, 185, 129, 0.18)',
          100: 'rgba(16, 185, 129, 0.35)',
          200: 'rgba(16, 185, 129, 0.55)',
        },
        red: {
          50: 'rgba(239, 68, 68, 0.18)',
          100: 'rgba(239, 68, 68, 0.35)',
          200: 'rgba(239, 68, 68, 0.55)',
        },
        amber: {
          50: 'rgba(245, 158, 11, 0.18)',
          100: 'rgba(245, 158, 11, 0.35)',
          200: 'rgba(245, 158, 11, 0.55)',
        },
        orange: {
          50: 'rgba(249, 115, 22, 0.18)',
          100: 'rgba(249, 115, 22, 0.35)',
          200: 'rgba(249, 115, 22, 0.55)',
        },
        purple: {
          50: 'rgba(139, 92, 246, 0.18)',
          100: 'rgba(139, 92, 246, 0.35)',
          200: 'rgba(139, 92, 246, 0.55)',
        },
        emerald: {
          50: 'rgba(16, 185, 129, 0.18)',
          100: 'rgba(16, 185, 129, 0.35)',
          200: 'rgba(16, 185, 129, 0.55)',
        },
        rose: {
          50: 'rgba(236, 72, 153, 0.18)',
          100: 'rgba(236, 72, 153, 0.35)',
          200: 'rgba(236, 72, 153, 0.55)',
        },
        pink: {
          50: 'rgba(236, 72, 153, 0.18)',
          100: 'rgba(236, 72, 153, 0.35)',
          200: 'rgba(236, 72, 153, 0.55)',
        },
        brand: {
          50: '#bae6fd',
          100: '#7dd3fc',
          200: '#38bdf8',
          300: '#0ea5e9',
          400: '#0284c7',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      boxShadow: {
        'premium-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'premium': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'premium-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'premium-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: .6, transform: 'scale(0.98)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: [],
}
