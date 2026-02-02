import { defineConfig } from '@playwright/test';

// baseURL precedence: PLAYWRIGHT_BASE_URL > E2E_BASE_URL > fallback
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';

export default defineConfig({
  use: {
    baseURL,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
});
