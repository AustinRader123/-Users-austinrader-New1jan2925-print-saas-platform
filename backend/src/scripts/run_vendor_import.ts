import fs from 'fs';
import path from 'path';
import VendorService from '../services/VendorService.js';
import VendorImportService from '../services/VendorImportService.js';

async function main() {
  const vendorName = process.env.VENDOR_NAME || 'Acme Vendor';
  const storeId = process.env.STORE_ID || 'cml43c2kt000110xp4pq3a76b';

  const vendors = await VendorService.listVendors();
  let vendor = vendors.find((v: any) => v.name === vendorName) || null;
  if (!vendor) {
    vendor = await VendorService.createVendor(vendorName, 'vendor@acme.com', 'csv');
  }
  const vendorId = vendor.id;

  const csv = [
    'productExternalId,productName,variantExternalId,variantSku,variantColor,variantSize,variantPrice,variantInventory,imageUrl',
    'SKU-001,Classic Tee,SKU-001-BLK-L,VEND-TSHIRT-BLACK-L,Black,L,12.99,100,https://via.placeholder.com/300x300',
    'SKU-001,Classic Tee,SKU-001-WHT-M,VEND-TSHIRT-WHITE-M,White,M,12.99,50,https://via.placeholder.com/300x300',
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
  } as any;

  const importOut = await VendorImportService.importCsv(vendorId, storeId, csv, mapping);
  const products = await VendorService.getVendorProducts(vendorId);
  const sample = Array.isArray(products) ? products[0] : products;

  const md = [
    '# Vendor Import Evidence',
    '',
    '## Create/Select Vendor',
    '**Vendor:**',
    '```json',
    JSON.stringify(vendor, null, 2),
    '```',
    '',
    '## Import CSV',
    '**Request:**',
    '```json',
    JSON.stringify({ storeId, mapping, csv }, null, 2),
    '```',
    '**Response:**',
    '```json',
    JSON.stringify(importOut, null, 2),
    '```',
    '',
    '## Counts',
    '```json',
    JSON.stringify({
      rows: (importOut as any).rows,
      createdProducts: (importOut as any).createdProducts,
      updatedProducts: (importOut as any).updatedProducts,
      createdVariants: (importOut as any).createdVariants,
      updatedVariants: (importOut as any).updatedVariants,
    }, null, 2),
    '```',
    '',
    '## Sample Normalized Record',
    '```json',
    JSON.stringify(sample, null, 2),
    '```',
  ].join('\n');

  const outPath = path.resolve(process.cwd(), '../docs/vendor-import.md');
  fs.writeFileSync(outPath, md);
  console.log('OK vendor', vendorId);
  console.log('OK wrote', outPath);
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
