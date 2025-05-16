/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: '#F0F9FF', // 淺藍色背景
          secondary: '#0369A1', // 深藍色
          accent: '#06B6D4', // 青色強調
        },
        animation: {
          'float-slow': 'float 8s ease-in-out infinite',
          'float-medium': 'float 6s ease-in-out infinite',
          'float-fast': 'float 4s ease-in-out infinite',
          'fadeIn': 'fadeIn 0.3s ease-out forwards',
          'scaleIn': 'scaleIn 0.3s ease-out forwards',
          'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-20px)' },
          },
          fadeIn: {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
          },
          scaleIn: {
            '0%': { transform: 'scale(0.9)', opacity: '0' },
            '100%': { transform: 'scale(1)', opacity: '1' },
          },
          pulse: {
            '0%, 100%': { opacity: '1' },
            '50%': { opacity: '.5' },
          },
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        },
      },
    },
    plugins: [],
  }