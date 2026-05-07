/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 28px rgba(34, 211, 238, 0.24), inset 0 0 18px rgba(34, 211, 238, 0.08)',
        amber: '0 0 22px rgba(245, 158, 11, 0.22)',
      },
    },
  },
  plugins: [],
};
