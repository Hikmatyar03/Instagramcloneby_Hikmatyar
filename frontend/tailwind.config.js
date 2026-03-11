/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                },
                surface: {
                    DEFAULT: '#0d0d0d',
                    card: '#1a1a1a',
                    border: '#262626',
                    muted: '#363636',
                    hover: '#2a2a2a',
                },
                text: {
                    primary: '#fafafa',
                    secondary: '#a8a8a8',
                    muted: '#737373',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            animation: {
                'heart-burst': 'heartBurst 0.4s ease-out',
                'fade-in': 'fadeIn 0.2s ease-out',
                'slide-up': 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                'story-progress': 'storyProgress linear forwards',
                pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                heartBurst: {
                    '0%': { transform: 'scale(0)', opacity: '1' },
                    '60%': { transform: 'scale(1.4)', opacity: '1' },
                    '100%': { transform: 'scale(1)', opacity: '0.8' },
                },
                fadeIn: {
                    from: { opacity: '0' },
                    to: { opacity: '1' },
                },
                slideUp: {
                    from: { transform: 'translateY(20px)', opacity: '0' },
                    to: { transform: 'translateY(0)', opacity: '1' },
                },
                storyProgress: {
                    from: { width: '0%' },
                    to: { width: '100%' },
                },
            },
        },
    },
    plugins: [],
};
