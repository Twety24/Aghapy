module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: '#10265a', stage: '#e8291f', sky: '#a9c6f0', ice: '#eef4fd' },
      fontFamily: { sans: ['var(--font-plex)', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
