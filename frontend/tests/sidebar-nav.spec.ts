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

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const storeId = 'default';

  const createProductResp = await request.post(`${root}/api/products`, {
    headers,
    failOnStatusCode: false,
    data: {
      storeId,
      name: `Smoke Product ${Date.now()}`,
      slug: `smoke-product-${Date.now()}`,
      basePrice: 12.5,
    },
  });
  expect([201, 400, 403].includes(createProductResp.status())).toBeTruthy();

  const productsResp = await request.get(`${root}/api/products?storeId=${storeId}&skip=0&take=20`, {
    headers,
    failOnStatusCode: false,
  });
  expect([200, 403].includes(productsResp.status())).toBeTruthy();

  let firstProductId = '';
  if (productsResp.status() === 200) {
    const productsBody = await productsResp.json();
    const products = Array.isArray(productsBody) ? productsBody : (productsBody?.items || productsBody?.products || []);
    firstProductId = String(products?.[0]?.id || '');
  }

  const quoteResp = await request.post(`${root}/api/quotes`, {
    headers,
    failOnStatusCode: false,
    data: {
      storeId,
      customerName: 'Smoke User',
      customerEmail: `smoke+${Date.now()}@example.local`,
      notes: 'sidebar-nav smoke quote',
    },
  });
  expect([201, 403].includes(quoteResp.status())).toBeTruthy();

  if (quoteResp.status() === 201 && firstProductId) {
    const quote = await quoteResp.json();
    const quoteId = String(quote.id || '');
    if (quoteId) {
      const variantsResp = await request.get(`${root}/api/products/${firstProductId}/variants?storeId=${storeId}`, {
        headers,
        failOnStatusCode: false,
      });
      let variantId = '';
      if (variantsResp.status() === 200) {
        const variantsBody = await variantsResp.json();
        const variants = Array.isArray(variantsBody) ? variantsBody : (variantsBody?.items || variantsBody?.variants || []);
        variantId = String(variants?.[0]?.id || '');
      }

      const addItemResp = await request.post(`${root}/api/quotes/${quoteId}/items`, {
        headers,
        failOnStatusCode: false,
        data: {
          storeId,
          productId: firstProductId,
          ...(variantId ? { variantId } : {}),
          qty: { units: 12 },
        },
      });
      expect([201, 400, 403].includes(addItemResp.status())).toBeTruthy();

      const convertResp = await request.post(`${root}/api/quotes/${quoteId}/convert`, {
        headers,
        failOnStatusCode: false,
        data: { storeId },
      });
      expect([201, 400, 403].includes(convertResp.status())).toBeTruthy();
    }
  }

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
