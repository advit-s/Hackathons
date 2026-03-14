/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#faf5ff',
                    100: '#f3e8ff',
                    200: '#e9d5ff',
                    300: '#d8b4fe',
                    400: '#c084fc',
                    500: '#a855f7',
                    600: '#9333ea',
                    700: '#7e22ce',
                    800: '#6b21a8',
                    900: '#581c87',
                },
                yoga: {
                    sage: '#9CAF88',
                    earth: '#D4A574',
                    sky: '#87CEEB',
                    lotus: '#DDA0DD',
                    zen: '#F5F5DC',
                }
            },
            backgroundImage: {
                'gradient-calm': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                'gradient-yoga': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'breathe': 'breathe 4s ease-in-out infinite',
            },
            keyframes: {
                breathe: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '1' },
                    '50%': { transform: 'scale(1.05)', opacity: '0.8' },
                }
            }
        },
    },
    plugins: [],
}
