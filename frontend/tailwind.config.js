/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0A3D62',
          light: '#0f5a91',
          dark: '#072b46'
        }
      }
    },
  },
  plugins: [],
}
