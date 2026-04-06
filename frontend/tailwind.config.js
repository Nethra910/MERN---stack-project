export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f0f',
          card: '#1a1a1a',
          hover: '#252525',
          border: '#2a2a2a',
          text: '#e5e5e5',
          muted: '#a3a3a3',
        }
      }
    }
  },
  plugins: [],
};