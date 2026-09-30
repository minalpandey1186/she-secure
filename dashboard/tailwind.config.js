/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        she: {
          dark: '#0f172a',
          darker: '#090d16',
          card: '#1e293b',
          border: '#334155',
          primary: '#e11d48',
          primaryHover: '#be123c',
          emergency: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          info: '#3b82f6',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}
