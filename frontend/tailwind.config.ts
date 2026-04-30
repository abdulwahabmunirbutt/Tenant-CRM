import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: '#d9e1e8',
        surface: '#f7f9fb',
        ink: '#17212b',
        muted: '#657282',
        accent: '#0f766e',
        danger: '#b42318',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23, 33, 43, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;

