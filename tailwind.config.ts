import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        jetbrains: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        oranje: {
          DEFAULT: '#FF6200',
          50: '#FFF3EC',
          100: '#FFE4CC',
          200: '#FFC799',
          300: '#FFA966',
          400: '#FF8C33',
          500: '#FF6200',
          600: '#CC4E00',
          700: '#993A00',
          800: '#662700',
          900: '#331300',
        },
        knvb: {
          DEFAULT: '#003082',
          50: '#EBF0FF',
          100: '#C7D5FF',
          200: '#8FACFF',
          300: '#5782FF',
          400: '#1F59FF',
          500: '#003082',
          600: '#002668',
          700: '#001C4E',
          800: '#001234',
          900: '#00091A',
        },
      },
    },
  },
  plugins: [],
}

export default config
