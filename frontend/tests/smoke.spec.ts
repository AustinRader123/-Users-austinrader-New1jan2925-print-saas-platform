import { test, expect } from '@playwright/test';
import { loginViaUi } from './helpers/auth';

test('@smoke admin pricing rules page loads', async ({ page }) => {
  await loginViaUi(page);
  await page.goto('/admin/pricing-rules');
  await expect(page.getByText('Pricing Rules')).toBeVisible({ timeout: 20000 });
});
