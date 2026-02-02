/*
 * Vendor import automation: creates vendor, imports CSV, fetches products,
 * and writes evidence to docs/vendor-import.md.
 */
const fs = require('fs');

const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const TOKEN = fs.readFileSync('/tmp/admin_token.txt', 'utf8').trim();
const headers = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

async function request(method, path, body) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${path}: ${text}`);
  }
  return { json, text, status: res.status };
}

function buildCsvAndMapping() {
  const csv = [
    'productExternalId,productName,variantExternalId,variantSku,variantColor,variantSize,variantPrice,variantInventory,imageUrl',
    'SKU-001,Classic Tee,SKU-001-BLK-L,TSHIRT-BLACK-L,Black,L,12.99,100,https://via.placeholder.com/300x300',
    'SKU-001,Classic Tee,SKU-001-WHT-M,TSHIRT-WHITE-M,White,M,12.99,50,https://via.placeholder.com/300x300',
  ].join('\n');
  const mapping = {
    productExternalId: 'productExternalId',
    productName: 'productName',
    imageUrl: 'imageUrl',
    variantExternalId: 'variantExternalId',
    variantSku: 'variantSku',
    variantColor: 'variantColor',
    variantSize: 'variantSize',
    variantPrice: 'variantPrice',
    variantInventory: 'variantInventory',
  };
  return { csv, mapping };
}

async function main() {
  if (typeof fetch !== 'function') {
    // Node<18 fallback
    global.fetch = (await import('node-fetch')).default;
  }
  console.log(`BASE=${BASE}`);

  // 1) Create vendor
  const vendorCreateBody = { name: 'Acme Vendor', email: 'vendor@acme.com', connectorType: 'csv' };
  const vendorCreate = await request('POST', '/api/vendors', vendorCreateBody);
  const vendorId = vendorCreate.json.id || vendorCreate.json.vendorId;
  if (!vendorId) throw new Error('No vendorId returned');
  console.log('vendorId', vendorId);

  // 2) Import CSV
  const { csv, mapping } = buildCsvAndMapping();
  const importBody = { storeId: 'cml43c2kt000110xp4pq3a76b', csv, mapping };
  const importRes = await request('POST', `/api/vendors/${vendorId}/import-csv`, importBody);
  const counts = {
    rows: importRes.json.rows,
    createdProducts: importRes.json.createdProducts,
    updatedProducts: importRes.json.updatedProducts,
    createdVariants: importRes.json.createdVariants,
    updatedVariants: importRes.json.updatedVariants,
  };
  console.log('import jobId', importRes.json.jobId || '');
  console.log('counts', counts);

  // 3) Verify products
  const productsRes = await request('GET', `/api/vendors/${vendorId}/products`);
  const productsJson = productsRes.json;
  const sample = Array.isArray(productsJson)
    ? productsJson[0]
    : (productsJson.products ? productsJson.products[0] : productsJson);

  // 4) Evidence doc
  const md = [
    '# Vendor Import Evidence',
    '',
    '## Create Vendor',
    '**Request:**',
    '```json',
    JSON.stringify(vendorCreateBody, null, 2),
    '```',
    '**Response:**',
    '```json',
    JSON.stringify(vendorCreate.json, null, 2),
    '```',
    '',
    '## Import CSV',
    '**Request:**',
    '```json',
    JSON.stringify(importBody, null, 2),
    '```',
    '**Response:**',
    '```json',
    JSON.stringify(importRes.json, null, 2),
    '```',
    '',
    '## Counts',
    '```json',
    JSON.stringify(counts, null, 2),
    '```',
    '',
    '## Sample Normalized Record',
    '```json',
    JSON.stringify(sample, null, 2),
    '```',
  ].join('\n');
  fs.writeFileSync('docs/vendor-import.md', md);
  console.log('Wrote docs/vendor-import.md');
}

main().catch(err => {
  console.error('ERROR', err.message);
  process.exit(1);
});
