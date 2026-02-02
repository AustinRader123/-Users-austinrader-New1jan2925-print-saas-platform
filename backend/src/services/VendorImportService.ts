import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

export interface CsvMapping {
  productExternalId: string;
  productName: string;
  productDescription?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  variantExternalId: string;
  variantSku?: string;
  variantSize?: string;
  variantColor?: string;
  variantPrice?: string;
  variantInventory?: string;
}

function parseCSV(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/);
  return lines.map((line) => {
    // minimal CSV parser: handles quoted fields and commas
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((v) => v.trim());
  });
}

export class VendorImportService {
  async importCsv(
    vendorId: string,
    storeId: string,
    csv: string,
    mapping: CsvMapping
  ) {
    const rows = parseCSV(csv);
    if (rows.length < 2) throw new Error('CSV must include header + at least one data row');
    const header = rows[0];
    const dataRows = rows.slice(1);

    const idx = (colName: string) => {
      const i = header.findIndex((h) => h.toLowerCase() === colName.toLowerCase());
      if (i === -1) return -1;
      return i;
    };

    const get = (row: string[], col?: string) => {
      if (!col) return undefined;
      const i = idx(col);
      return i >= 0 ? row[i] : undefined;
    };

    const job = await prisma.vendorSyncJob.create({
      data: { vendorId, type: 'products', status: 'PROCESSING', startedAt: new Date() },
    });

    let productCount = 0;
    let variantCount = 0;
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; error: string }> = [];

    try {
      for (let idxRow = 0; idxRow < dataRows.length; idxRow++) {
        const row = dataRows[idxRow];
        const pExternalId = get(row, mapping.productExternalId) || get(row, 'productExternalId');
        const pName = get(row, mapping.productName) || get(row, 'productName');
        if (!pExternalId || !pName) {
          errors.push({ row: idxRow + 2, error: 'Missing productExternalId or productName' });
          continue;
        }
        const pDesc = get(row, mapping.productDescription);
        const brand = get(row, mapping.brand);
        const category = get(row, mapping.category);
        const imageUrl = get(row, mapping.imageUrl);

        const vExternalId = get(row, mapping.variantExternalId) || get(row, 'variantExternalId');
        const vSku = get(row, mapping.variantSku);
        const vSize = get(row, mapping.variantSize);
        const vColor = get(row, mapping.variantColor);
        const vPriceStr = get(row, mapping.variantPrice);
        const vInvStr = get(row, mapping.variantInventory);
        const vPrice = vPriceStr ? parseFloat(vPriceStr) : 0;
        const vInv = vInvStr ? parseInt(vInvStr) : 0;

        // Upsert VendorProduct
        const existingVp = await prisma.vendorProduct.findUnique({ where: { vendorId_externalId: { vendorId, externalId: pExternalId! } } });
        let vp;
        if (!existingVp) {
          vp = await prisma.vendorProduct.create({
            data: {
              vendorId,
              externalId: pExternalId!,
              name: pName!,
              description: pDesc,
              basePrice: vPrice || 0,
              brand,
              category,
              imageUrl,
              syncData: {},
            },
          });
          created++;
        } else {
          vp = await prisma.vendorProduct.update({
            where: { id: existingVp.id },
            data: {
              name: pName!,
              description: pDesc,
              basePrice: vPrice || 0,
              brand,
              category,
              imageUrl,
              lastSyncedAt: new Date(),
            },
          });
          updated++;
        }
        productCount++;

        // Upsert VendorProductVariant
        const existingVpv = await prisma.vendorProductVariant.findUnique({
          where: { vendorProductId_externalId: { vendorProductId: vp.id, externalId: vExternalId! } },
        });
        let vpv;
        if (!existingVpv) {
          vpv = await prisma.vendorProductVariant.create({
            data: {
              vendorProductId: vp.id,
              externalId: vExternalId!,
              sku: vSku,
              size: vSize,
              color: vColor,
              price: vPrice,
              inventory: vInv,
            },
          });
          created++;
        } else {
          vpv = await prisma.vendorProductVariant.update({
            where: { id: existingVpv.id },
            data: {
              sku: vSku,
              size: vSize,
              color: vColor,
              price: vPrice,
              inventory: vInv,
              updatedAt: new Date(),
            },
          });
          updated++;
        }
        variantCount++;

        // Normalize into store Product/ProductVariant and link
        const slugBase = (pName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const product = await prisma.product.upsert({
          where: { storeId_slug: { storeId, slug: slugBase } },
          create: {
            storeId,
            vendorId,
            name: pName!,
            slug: slugBase,
            description: pDesc,
            basePrice: vPrice || 0,
            status: 'ACTIVE',
            type: 'BLANK',
            images: imageUrl
              ? { create: [{ url: imageUrl, altText: pName!, position: 0 }] }
              : undefined,
          },
          update: {
            description: pDesc,
            basePrice: vPrice || 0,
            updatedAt: new Date(),
          },
          include: { variants: true },
        });

        let variant = await prisma.productVariant.findFirst({
          where: { productId: product.id, sku: vSku || vExternalId! },
        });
        if (!variant) {
          variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              name: `${vColor || 'Variant'}${vSize ? ' - ' + vSize : ''}`,
              sku: vSku || vExternalId!,
              size: vSize,
              color: vColor,
              supplierCost: vPrice || 0,
              inventoryCount: vInv || 0,
            },
          });
        } else {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              size: vSize,
              color: vColor,
              supplierCost: vPrice || 0,
              inventoryCount: vInv || 0,
            },
          });
        }

        await prisma.vendorProductVariant.update({
          where: { id: vpv.id },
          data: { productVariantId: variant.id },
        });
      }

      await prisma.vendorSyncJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', endedAt: new Date() },
      });

      logger.info(`CSV import completed: products=${productCount}, variants=${variantCount}, created=${created}, updated=${updated}, errors=${errors.length}`);
      return { jobId: job.id, products: productCount, variants: variantCount, created, updated, errorsCount: errors.length, errors };
    } catch (err: any) {
      await prisma.vendorSyncJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: err?.stack || err?.message || String(err), endedAt: new Date() },
      });
      throw err;
    }
  }
}

export default new VendorImportService();