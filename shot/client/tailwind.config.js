/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#1b2a4a',
          blue: '#0071bc',
          'blue-dark': '#205493',
          'blue-light': '#4773aa',
          green: '#2e8540',
          'green-light': '#4aa564',
          red: '#981b1e',
          yellow: '#fdb81e',
          gray: '#5b616b',
          'gray-light': '#aeb0b5',
          'gray-lighter': '#d6d7d9',
          'gray-lightest': '#f1f1f1',
        },
      },
    },
  },
  plugins: [],
};
