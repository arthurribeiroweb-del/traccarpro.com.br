/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0b',
        surface: '#111',
        muted: '#71717a',
        border: '#27272a',
        accent: '#3b82f6',
        'accent-hover': '#2563eb',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1120px',
      },
    },
  },
  plugins: [],
};
