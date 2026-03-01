import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const LOCAL_FALLBACK_DB_URL = 'postgresql://postgres:postgres@localhost:5432/deco_network?schema=public';

function parseDotenvValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readDatabaseUrlFromBackendEnv() {
  const envPath = path.join(root, 'backend', '.env');
  if (!fs.existsSync(envPath)) return '';

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!trimmed.startsWith('DATABASE_URL=')) continue;
    return parseDotenvValue(trimmed.slice('DATABASE_URL='.length));
  }
  return '';
}

function resolveDatabaseUrl() {
  const fromEnv = String(process.env.DATABASE_URL || '').trim();
  if (fromEnv) return fromEnv;

  if (String(process.env.DOCTOR_ALLOW_LOCALHOST_DB || '') === '1') {
    const fromBackendEnv = readDatabaseUrlFromBackendEnv();
    if (fromBackendEnv) return fromBackendEnv;
    return LOCAL_FALLBACK_DB_URL;
  }

  throw new Error('smoke:prod_sim requires DATABASE_URL (or set DOCTOR_ALLOW_LOCALHOST_DB=1 to use local db).');
}

function run(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120000;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(output);
        return;
      }
      reject(new Error(`Command failed (${code}): ${command} ${args.join(' ')}`));
    });
  });
}

async function waitForHttp(url, timeoutMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.status === 200) {
        return;
      }
    } catch {
      // retry
    }
    await delay(1000);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function getSeededIds() {
  const output = await run(
    'node',
    [
      '--input-type=module',
      '-e',
      "import { PrismaClient } from '@prisma/client'; const prisma=new PrismaClient(); const store=await prisma.store.findFirst({orderBy:{createdAt:'asc'}}); const product=store?await prisma.product.findFirst({where:{storeId:store.id,status:'ACTIVE'},include:{variants:true},orderBy:{createdAt:'asc'}}):null; console.log(JSON.stringify({storeSlug:store?.slug||'',productId:product?.id||'',variantId:product?.variants?.[0]?.id||''})); await prisma.$disconnect();",
    ],
    { cwd: path.join(root, 'backend'), timeoutMs: 30000 }
  );

  const lastLine = output.trim().split('\n').filter(Boolean).at(-1) || '{}';
  const parsed = JSON.parse(lastLine);
  if (!parsed.storeSlug || !parsed.productId || !parsed.variantId) {
    throw new Error('Unable to resolve seeded store/product/variant for prod-sim smoke');
  }
  return parsed;
}

async function publicCheckoutFlow(baseUrl, storeSlug, productId, variantId) {
  const storefrontRes = await fetch(`${baseUrl}/api/public/storefront/${encodeURIComponent(storeSlug)}`);
  if (storefrontRes.status !== 200) {
    throw new Error(`Storefront request failed: ${storefrontRes.status}`);
  }

  const cartRes = await fetch(`${baseUrl}/api/public/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storeSlug }),
  });
  if (cartRes.status !== 201) {
    throw new Error(`Create cart failed: ${cartRes.status}`);
  }
  const cart = await cartRes.json();
  if (!cart?.token) {
    throw new Error('Create cart response missing token');
  }

  const addItemRes = await fetch(`${baseUrl}/api/public/cart/${cart.token}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, variantId, quantity: 2 }),
  });
  if (addItemRes.status !== 201) {
    throw new Error(`Add cart item failed: ${addItemRes.status}`);
  }

  const checkoutRes = await fetch(`${baseUrl}/api/public/checkout/${cart.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: 'prod-sim-smoke@example.com',
      customerName: 'Prod Sim Smoke',
      shippingAddress: {
        line1: '123 Main',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'US',
      },
      paymentProvider: 'NONE',
    }),
  });
  if (checkoutRes.status !== 201) {
    throw new Error(`Checkout failed: ${checkoutRes.status}`);
  }
}

async function assertPortClosed(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/__ping`, { method: 'GET' });
      if (response.status === 200) {
        await delay(500);
        continue;
      }
    } catch {
      return;
    }
  }
  throw new Error(`Backend port ${port} is still active after shutdown`);
}

async function main() {
  const resolvedDatabaseUrl = resolveDatabaseUrl();
  const backendPort = process.env.BACKEND_PORT || '3100';
  const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${backendPort}`;
  const env = {
    ...process.env,
    DATABASE_URL: resolvedDatabaseUrl,
    NODE_ENV: 'production',
    DOCTOR_PROFILE: 'production',
    FRONTEND_PORT: process.env.FRONTEND_PORT || '3999',
    BACKEND_PORT: backendPort,
    PORT: backendPort,
    BASE_URL: baseUrl,
    JWT_SECRET: process.env.JWT_SECRET || 'phase6-1-prod-sim-jwt-secret-at-least-32-characters',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    BILLING_PROVIDER: process.env.BILLING_PROVIDER || 'mock',
    S3_USE_LOCAL: process.env.S3_USE_LOCAL || 'true',
    ENABLE_VENDOR_SYNC: process.env.ENABLE_VENDOR_SYNC || 'false',
    ENABLE_EMAIL_NOTIFICATIONS: process.env.ENABLE_EMAIL_NOTIFICATIONS || 'false',
  };

  console.log('[prod-sim] stop existing local services');
  await run('npm', ['run', 'stop'], { env, timeoutMs: 120000 });

  console.log('[prod-sim] doctor (production profile)');
  await run('npm', ['run', 'doctor', '--', '--prod'], { env, timeoutMs: 120000 });

  console.log('[prod-sim] db reset + seed');
  await run('npm', ['run', 'db:reset'], { cwd: path.join(root, 'backend'), env, timeoutMs: 240000 });
  await run('npm', ['run', 'db:seed'], { cwd: path.join(root, 'backend'), env, timeoutMs: 120000 });

  console.log('[prod-sim] build backend');
  await run('npm', ['run', 'build'], { cwd: path.join(root, 'backend'), env, timeoutMs: 180000 });

  const ids = await getSeededIds();

  console.log('[prod-sim] start backend (prod-like)');
  const backend = spawn('node', ['dist/index.js'], {
    cwd: path.join(root, 'backend'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backend.stdout.on('data', (chunk) => process.stdout.write(String(chunk)));
  backend.stderr.on('data', (chunk) => process.stderr.write(String(chunk)));

  try {
    await waitForHttp(`${baseUrl}/health`, 90000);
    await waitForHttp(`${baseUrl}/ready`, 90000);
    await publicCheckoutFlow(baseUrl, ids.storeSlug, ids.productId, ids.variantId);
    console.log('[prod-sim] PASS');
  } finally {
    backend.kill('SIGTERM');
    await delay(1200);
    if (!backend.killed) {
      backend.kill('SIGKILL');
    }
    await assertPortClosed(backendPort, 20000);
  }
}

main().catch((error) => {
  console.error(`[prod-sim] FAIL: ${error.message}`);
  process.exit(1);
});
