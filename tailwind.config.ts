import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#0e0d0b',
        panel: '#181614',
        p2: '#1f1c19',
        p3: '#27231e',
        t: '#f5ede0',
        t2: '#9e9182',
        t3: '#5a5045',
        acc: '#d4754a',
        acc2: '#e08a60',
        gr: '#3ec87a',
        rd: '#e05252',
      },
    },
  },
  plugins: [],
}
export default config
