export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        sidebar: 'var(--bg-sidebar)',
        border: {
          DEFAULT: 'var(--border-default)',
          muted: 'var(--border-muted)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          muted: 'var(--primary-muted)',
          text: 'var(--primary-text)',
        },
        status: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)',
          draft: 'var(--draft)',
          production: 'var(--production)',
          approved: 'var(--approved)',
          cancelled: 'var(--cancelled)',
        },
      },
    },
  },
  plugins: [],
};
