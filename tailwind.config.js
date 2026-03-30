/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        piri: {
          DEFAULT: '#2D0A00',
          muted: 'rgba(45, 10, 0, 0.6)',
          bg: '#FFFBF2',
          cream: '#FFF0D6',
          ethereum: '#FF6B9D',
          base: '#1D4ED8',
          venmo: '#0EA5E9',
          bitcoin: '#F59E0B',
          solana: '#9945FF',
          tezos: '#2B7DF7',
          cashapp: '#10B981',
          zelle: '#6D1ED4',
          paypal: '#003087',
        },
      },
      fontFamily: {
        'piri-display': ['Fredoka One', 'cursive'],
        'piri': ['Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
