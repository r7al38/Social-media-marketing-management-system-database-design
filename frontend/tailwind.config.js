/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
      extend: {
        colors: {
          primary:   { DEFAULT: '#60A5FA', light: '#EFF6FF', dark: '#3B82F6' },
          purple:    { DEFAULT: '#A78BFA', light: '#F5F3FF', dark: '#7C3AED' },
          navy:      { DEFAULT: '#1E3A8A' },
          success:   { DEFAULT: '#22C55E', light: '#F0FDF4' },
          danger:    { DEFAULT: '#EF4444', light: '#FEF2F2' },
          warning:   { DEFAULT: '#F59E0B', light: '#FFFBEB' },
          surface:   { DEFAULT: '#F8FAFC' },
          border:    { DEFAULT: '#E5E7EB' },
          muted:     { DEFAULT: '#6B7280' },
        },
        fontFamily: {
          sans: ['Poppins', 'sans-serif'],
        },
        boxShadow: {
          card:   '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
          'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
          sidebar: '2px 0 12px 0 rgb(0 0 0 / 0.05)',
        },
        borderRadius: {
          '2xl': '1rem',
          '3xl': '1.5rem',
        },
        animation: {
          'slide-in':  'slideIn 0.3s ease-out',
          'fade-in':   'fadeIn 0.2s ease-out',
          'progress':  'progress 0.6s ease-out',
        },
        keyframes: {
          slideIn:  { from: { transform: 'translateX(100%)', opacity: 0 }, to: { transform: 'translateX(0)', opacity: 1 } },
          fadeIn:   { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          progress: { from: { width: '0%' } },
        },
      },
    },
    plugins: [],
  };