/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'light-blue': '#93C5FD',
        'soft-blue': '#60A5FA',
        'primary-blue': '#3B82F6',
      },
    },
  },
  plugins: [],
}

