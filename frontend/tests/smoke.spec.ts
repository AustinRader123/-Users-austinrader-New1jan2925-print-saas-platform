import { test, expect } from '@playwright/test';
import { loginViaUi } from './helpers/auth';

test('@smoke production dashboard loads', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/admin/production');
  await expect(page.getByTestId('production-dashboard')).toBeVisible();
});
