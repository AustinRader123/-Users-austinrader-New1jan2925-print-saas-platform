import { expect, test } from '@playwright/test';

const rootFrom = (baseURL?: string | null) => {
  const resolved = (baseURL || '').trim();
  if (!resolved) return 'https://skuflow.ai';
  if (resolved.includes('127.0.0.1') || resolved.includes('localhost')) return 'https://skuflow.ai';
  return resolved;
};

async function maybeAuthToken(request: any, root: string) {
  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;
  if (!email || !password) return '';
  const login = await request.post(`${root}/api/auth/login`, {
    data: { email, password },
    failOnStatusCode: false,
  });
  if (!login.ok()) return '';
  const body = await login.json();
  return String(body?.token || '');
}

async function checkApi(
  request: any,
  root: string,
  path: string,
  token?: string,
  allowedStatuses: number[] = [200, 400, 401, 403],
  requireNotFound = true,
) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const resp = await request.get(`${root}${path}`, { headers, failOnStatusCode: false });
  expect(allowedStatuses.includes(resp.status()), `${path} unexpected status ${resp.status()}`).toBeTruthy();
  if (requireNotFound) {
    expect(resp.status(), `${path} should not be 404`).not.toBe(404);
  }
}

test('@orders route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/orders');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/orders', token || undefined);
});

test('@products route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/products');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/products?storeId=default', token || undefined);
});

test('@quotes route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/quotes');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/quotes?storeId=default', token || undefined);
});

test('@production route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/production/board');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/production/jobs?storeId=default', token || undefined);
});

test('@inventory route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/inventory');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/inventory?storeId=default', token || undefined);
});

test('@purchasing route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/purchasing');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/purchasing/pos?storeId=default&tenantId=default', token || undefined);
});

test('@shipping route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/shipments');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/shipping/shipments?storeId=default', token || undefined);
});

test('@billing route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/app/billing');
  const token = await maybeAuthToken(request, root);
  await checkApi(request, root, '/api/order-billing/invoices?storeId=default', token || undefined);
});

test('@portal route and api smoke', async ({ request, baseURL }) => {
  const root = rootFrom(baseURL);
  await checkApi(request, root, '/api/public/portal/invalid-token', undefined, [200, 400, 401, 403, 404], false);
});
