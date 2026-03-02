import { expect, test } from '@playwright/test';

test('sidebar IA routes are reachable', async ({ page, request, baseURL }) => {
  const root = baseURL || 'https://skuflow.ai';

  const buildResp = await request.get(`${root}/__build.json`, { failOnStatusCode: false });
  expect(buildResp.ok()).toBeTruthy();
  const build = await buildResp.json();
  expect(typeof build?.commit).toBe('string');
  expect(typeof build?.buildTime).toBe('string');
  expect(typeof build?.version).toBe('string');

  const appRoutes = [
    '/app',
    '/app/orders',
    '/app/products',
    '/app/catalogs',
    '/app/production/board',
    '/app/purchasing',
    '/app/inventory',
    '/app/billing',
    '/app/payments',
    '/app/taxes',
    '/app/shipments',
    '/app/webhooks',
    '/app/customers',
    '/app/stores',
    '/app/users-roles',
    '/app/settings',
    '/app/integrations',
    '/app/reports',
  ];

  for (const route of appRoutes) {
    const resp = await request.get(`${root}${route}`, { failOnStatusCode: false });
    expect(resp.status(), `${route} should resolve through SPA routing`).toBe(200);
  }

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
  await expect(page.getByText(/Build:/i)).toBeVisible({ timeout: 20000 });

  const navLabels = [
    'Dashboard',
    'Orders',
    'Products',
    'Catalogs',
    'Production',
    'Purchasing',
    'Inventory',
    'Billing / Invoices',
    'Payments',
    'Taxes',
    'Shipments',
    'Webhooks / Tracking',
    'Customers',
    'Stores',
    'Users / Roles',
    'Settings',
    'Integrations',
    'Reports',
  ];

  for (const label of navLabels) {
    const link = page.getByRole('link', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    if ((await link.count()) === 0) continue;
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/app\/.*/);
  }
});
