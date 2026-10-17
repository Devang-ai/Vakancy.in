/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Google Stitch "Executive Precision" Core Design Tokens
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#cbdbf5',
          bright: '#f8f9ff',
          variant: '#d3e4fe',
          50: '#f8fafc',
          100: '#f1f5f9',
          800: '#151b28',
          850: '#101522',
          900: '#0c101a',
          950: '#07090e',
        },
        'surface-container': {
          lowest: '#ffffff',
          low: '#eff4ff',
          DEFAULT: '#e5eeff',
          high: '#dce9ff',
          highest: '#d3e4fe',
        },
        'on-surface': {
          DEFAULT: '#0b1c30',
          variant: '#444653',
        },
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        outline: {
          DEFAULT: '#757684',
          variant: '#c4c5d5',
        },
        'surface-tint': '#3755c3',
        primary: {
          DEFAULT: '#00288e',
          container: '#1e40af',
          fixed: '#dde1ff',
          'fixed-dim': '#b8c4ff',
          'on-fixed': '#001453',
          'on-fixed-variant': '#173bab',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#a8b8ff',
        },
        'inverse-primary': '#b8c4ff',
        secondary: {
          DEFAULT: '#006a61',
          container: '#86f2e4',
          fixed: '#89f5e7',
          'fixed-dim': '#6bd8cb',
          'on-fixed': '#00201d',
          'on-fixed-variant': '#005049',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#006f66',
        },
        tertiary: {
          DEFAULT: '#273548',
          container: '#3e4c60',
          fixed: '#d5e3fc',
          'fixed-dim': '#b9c7df',
          'on-fixed': '#0d1c2e',
          'on-fixed-variant': '#3a485b',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#aebcd4',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      maxWidth: {
        'max-width': '80rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
