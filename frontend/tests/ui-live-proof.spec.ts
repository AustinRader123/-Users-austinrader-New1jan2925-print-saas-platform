import { expect, test } from '@playwright/test';

type BuildInfo = { commit?: string; buildTime?: string; env?: string };

test('deploy proof + app navigation smoke', async ({ page, request, baseURL }) => {
  const root = baseURL || 'https://skuflow.ai';

  const buildResp = await request.get(`${root}/__ui_build.json`, { failOnStatusCode: false });
  const fallbackResp = buildResp.ok() ? null : await request.get(`${root}/__build.json`, { failOnStatusCode: false });
  const effectiveResp = buildResp.ok() ? buildResp : fallbackResp;
  expect(effectiveResp?.ok()).toBeTruthy();
  const build = (await effectiveResp!.json()) as BuildInfo;
  expect(typeof build.commit).toBe('string');
  expect(typeof build.buildTime).toBe('string');

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!email || !password) {
    await page.goto(`${root}/app`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login|\/app/);
    return;
  }

  const loginResp = await request.post(`${root}/api/auth/login`, {
    data: { email, password },
  });
  expect(loginResp.ok()).toBeTruthy();
  const loginJson = await loginResp.json();
  const token = String(loginJson?.token || '');
  expect(token.length).toBeGreaterThan(10);

  await page.addInitScript((value) => {
    window.localStorage.setItem('token', value);
  }, token);

  await page.goto(`${root}/app`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('UI commit')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 20000 });

  const navItems: Array<{ label: string; title: RegExp }> = [
    { label: 'Orders', title: /Orders/i },
    { label: 'Products', title: /Products/i },
    { label: 'Quotes', title: /Quotes/i },
    { label: 'Production', title: /Production/i },
    { label: 'Inventory', title: /Inventory/i },
    { label: 'Purchasing', title: /Purchasing/i },
    { label: 'Billing', title: /Billing/i },
    { label: 'Shipping', title: /Shipping/i },
    { label: 'Reports', title: /Reports/i },
    { label: 'Admin', title: /Admin/i },
    { label: 'Settings', title: /Settings/i },
  ];

  for (const item of navItems) {
    const link = page.getByRole('link', { name: new RegExp(item.label, 'i') }).first();
    if ((await link.count()) === 0) continue;
    await link.click();
    await expect(page.getByRole('heading', { name: item.title })).toBeVisible({ timeout: 15000 });
  }

  const authHeaders = { Authorization: `Bearer ${token}` };
  const sectionChecks = [
    '/api/orders',
    '/api/products?storeId=default',
    '/api/quotes?storeId=default',
    '/api/production/jobs?storeId=default',
    '/api/inventory?storeId=default',
    '/api/purchase-orders?storeId=default',
    '/api/order-billing/invoices?storeId=default',
    '/api/shipping/shipments?storeId=default',
    '/api/reports/summary?storeId=default',
  ];

  for (const path of sectionChecks) {
    const resp = await request.get(`${root}${path}`, { headers: authHeaders, failOnStatusCode: false });
    expect(resp.status(), `${path} should not be 404`).not.toBe(404);
  }
});
