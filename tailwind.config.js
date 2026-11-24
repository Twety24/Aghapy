module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { navy: '#10265a', stage: '#d92d3a', sky: '#f6cbd0', ice: '#f4f7fc' },
      fontFamily: { sans: ['var(--font-plex)', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
