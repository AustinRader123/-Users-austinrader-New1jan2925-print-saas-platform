import { test, expect } from '@playwright/test';

// Intentionally NOT tagged @pack so regression has at least one test when pack is skipped.
test('@regression non-pack sanity loads base', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toBeVisible();
});
