/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#0b3d1b',
          light: '#eef3f0',
        }
      },
      fontFamily: {
        sans: ['Prompt', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 20px 50px -12px rgba(11, 61, 27, 0.15)',
      }
    },
  },
  plugins: [],
};