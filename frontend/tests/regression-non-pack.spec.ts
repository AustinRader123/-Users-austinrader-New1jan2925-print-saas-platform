import { test, expect } from '@playwright/test';

// @regression NON-PACK sanity test
// Purpose: Ensure regression lane has coverage even when @pack is skipped.
// This test avoids auth assumptions; it just checks the root page renders.

test.describe('@regression non-pack', () => {
  test('@regression loads home page', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('html');
    await expect(root).toBeVisible();
  });
});
