/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e7145',
        secondary: '#1e7145',
        background: '#ffffff',
        dark: '#000000',
        accent: '#1e7145',
        green: {
          50: '#f0f9f4',
          100: '#dcf2e4',
          200: '#bce4cd',
          300: '#8fcfab',
          400: '#5bb382',
          500: '#1e7145',
          600: '#1e7145',
          700: '#165832',
          800: '#13472a',
          900: '#0f2f1e',
        },
      },
    },
  },
  plugins: [],
}

