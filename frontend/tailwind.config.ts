import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#1F7E6F',
          50: '#E6F2F0',
          600: '#1F7E6F',
          700: '#175E54',
        },
      },
    },
  },
  plugins: [],
};

export default config;
