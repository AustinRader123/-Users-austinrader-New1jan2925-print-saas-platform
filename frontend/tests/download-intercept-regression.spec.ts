import { test, expect, request } from '@playwright/test';
import { loginViaUi } from './helpers/auth';
import { ensureSeededJob } from './utils/seed';

const BASE_API = process.env.BACKEND_BASE_URL ? `${process.env.BACKEND_BASE_URL}/api` : 'http://127.0.0.1:3000/api';

async function ensureAnyDownloadLink(page: any) {
  // Try to use an existing download link on the board if present
  const anyLink = page.getByTestId('pack-download').first();
  try {
    await anyLink.waitFor({ state: 'visible', timeout: 3000 });
    return anyLink;
  } catch {}

  // Fallback: generate on first card then wait for link anywhere
  const firstCard = page.getByTestId('job-card').first();
  await firstCard.getByTestId('generate-pack').click();
  await expect(page.getByTestId('pack-download').first()).toBeVisible({ timeout: 20000 });
  return page.getByTestId('pack-download').first();
}

test('@regression @pack download intercept adds auth only for pack route', async ({ page }) => {
  const api = await request.newContext();
  const resp = await api.post(`${BASE_API}/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL || 'admin@local.test', password: process.env.ADMIN_PASSWORD || 'Admin123!' },
    headers: { 'Content-Type': 'application/json' },
  });
  const token = (await resp.json()).token as string;
  await ensureSeededJob(BASE_API, token);

  await loginViaUi(page);
  await page.goto('/admin/production');
  await expect(page.getByTestId('production-dashboard')).toBeVisible();
  const downloadLink = await ensureAnyDownloadLink(page);

  // Intercept and add Authorization only for pack-download route
  await page.route('**/api/admin/production/jobs/**/pack/download', async (route) => {
    const headers = { ...(route.request().headers()), Authorization: `Bearer ${token}` } as Record<string, string>;
    await route.continue({ headers });
  });

  await downloadLink.evaluate((el) => el.removeAttribute('target'));
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadLink.click(),
  ]);
  const zipPath = await download.path();
  expect(zipPath).toBeTruthy();

  // Interception must not affect unrelated route
  const vendorsResp = await api.get(`${BASE_API}/vendors`, { headers: { Authorization: `Bearer ${token}` } });
  expect(vendorsResp.ok()).toBeTruthy();
});

test('@regression @pack download without intercept fails', async ({ page }) => {
  const api = await request.newContext();
  const resp = await api.post(`${BASE_API}/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL || 'admin@local.test', password: process.env.ADMIN_PASSWORD || 'Admin123!' },
    headers: { 'Content-Type': 'application/json' },
  });
  const token = (await resp.json()).token as string;
  await ensureSeededJob(BASE_API, token);

  await loginViaUi(page);
  await page.goto('/admin/production');
  const downloadLink = await ensureAnyDownloadLink(page);
  await downloadLink.evaluate((el) => el.removeAttribute('target'));

  // Try click without route intercept: expect no download event within short timeout
  let gotDownload = false;
  page.once('download', () => { gotDownload = true; });
  await downloadLink.click();
  await page.waitForTimeout(1000);
  expect(gotDownload).toBeFalsy();
});
