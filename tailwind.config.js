/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tennis: {
          ball: '#CCFF00',
          court: '#1E3A8A',
          clay: '#D97706',
          grass: '#15803D',
          dark: '#0F172A',
          darker: '#020617',
          surface: '#1E293B',
          accent: '#00E5FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
