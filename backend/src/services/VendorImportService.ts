import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
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

  /**
   * Async job processor: reads CSV file from disk and updates ImportJob + ImportJobError progressively.
   * If whitelistRows is provided, only processes those row numbers (1-based including header -> data starts at 2).
   */
  async runImportJob(
    jobId: string,
    vendorId: string,
    storeId: string,
    filePath: string,
    mapping: CsvMapping = {} as any,
    whitelistRows?: number[]
  ) {
    const exists = fs.existsSync(filePath);
    if (!exists) {
      await prisma.importJob.update({ where: { id: jobId }, data: { status: 'FAILED', error: `File not found: ${filePath}`, finishedAt: new Date() } });
      return;
    }
    const csv = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(csv);
    if (rows.length < 2) {
      await prisma.importJob.update({ where: { id: jobId }, data: { status: 'FAILED', error: 'CSV must include header + at least one data row', finishedAt: new Date() } });
      return;
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    const idx = (colName: string) => {
      const i = header.findIndex((h) => h.toLowerCase() === colName.toLowerCase());
      return i === -1 ? -1 : i;
    };

    const get = (row: string[], col?: string) => {
      if (!col) return undefined;
      const i = idx(col);
      return i >= 0 ? row[i] : undefined;
    };

    await prisma.importJob.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date(), totalRows: dataRows.length } });

    let created = 0;
    let updated = 0;
    let failed = 0;
    let processed = 0;

    const shouldProcess = (rowNumber: number) => {
      if (!whitelistRows || whitelistRows.length === 0) return true;
      return whitelistRows.includes(rowNumber);
    };

    try {
      for (let idxRow = 0; idxRow < dataRows.length; idxRow++) {
        const rowNumber = idxRow + 2; // header is row 1
        if (!shouldProcess(rowNumber)) continue;
        const row = dataRows[idxRow];
        try {
          const pExternalId = get(row, (mapping as any).productExternalId) || get(row, 'productExternalId');
          const pName = get(row, (mapping as any).productName) || get(row, 'productName');
          if (!pExternalId || !pName) {
            failed++;
            await prisma.importJobError.create({ data: { jobId, rowNumber, message: 'Missing productExternalId or productName', rawRow: row } });
            continue;
          }
          const pDesc = get(row, (mapping as any).productDescription);
          const brand = get(row, (mapping as any).brand);
          const category = get(row, (mapping as any).category);
          const imageUrl = get(row, (mapping as any).imageUrl);

          const vExternalId = get(row, (mapping as any).variantExternalId) || get(row, 'variantExternalId');
          const vSku = get(row, (mapping as any).variantSku);
          const vSize = get(row, (mapping as any).variantSize);
          const vColor = get(row, (mapping as any).variantColor);
          const vPriceStr = get(row, (mapping as any).variantPrice);
          const vInvStr = get(row, (mapping as any).variantInventory);
          const vPrice = vPriceStr ? parseFloat(vPriceStr) : 0;
          const vInv = vInvStr ? parseInt(vInvStr) : 0;

          const existingVp = await prisma.vendorProduct.findUnique({ where: { vendorId_externalId: { vendorId, externalId: pExternalId! } } });
          let vp;
          if (!existingVp) {
            vp = await prisma.vendorProduct.create({
              data: { vendorId, externalId: pExternalId!, name: pName!, description: pDesc, basePrice: vPrice || 0, brand, category, imageUrl, syncData: {} },
            });
            created++;
          } else {
            vp = await prisma.vendorProduct.update({
              where: { id: existingVp.id },
              data: { name: pName!, description: pDesc, basePrice: vPrice || 0, brand, category, imageUrl, lastSyncedAt: new Date() },
            });
            updated++;
          }

          const existingVpv = await prisma.vendorProductVariant.findUnique({
            where: { vendorProductId_externalId: { vendorProductId: vp.id, externalId: vExternalId! } },
          });
          let vpv;
          if (!existingVpv) {
            vpv = await prisma.vendorProductVariant.create({
              data: { vendorProductId: vp.id, externalId: vExternalId!, sku: vSku, size: vSize, color: vColor, price: vPrice, inventory: vInv },
            });
            created++;
          } else {
            vpv = await prisma.vendorProductVariant.update({
              where: { id: existingVpv.id },
              data: { sku: vSku, size: vSize, color: vColor, price: vPrice, inventory: vInv, updatedAt: new Date() },
            });
            updated++;
          }

          const slugBase = (pName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const product = await prisma.product.upsert({
            where: { storeId_slug: { storeId, slug: slugBase } },
            create: { storeId, vendorId, name: pName!, slug: slugBase, description: pDesc, basePrice: vPrice || 0, status: 'ACTIVE', type: 'BLANK', images: imageUrl ? { create: [{ url: imageUrl, altText: pName!, position: 0 }] } : undefined },
            update: { description: pDesc, basePrice: vPrice || 0, updatedAt: new Date() },
            include: { variants: true },
          });

          let variant = await prisma.productVariant.findFirst({ where: { productId: product.id, sku: vSku || vExternalId! } });
          if (!variant) {
            variant = await prisma.productVariant.create({
              data: { productId: product.id, name: `${vColor || 'Variant'}${vSize ? ' - ' + vSize : ''}`, sku: vSku || vExternalId!, size: vSize, color: vColor, supplierCost: vPrice || 0, inventoryCount: vInv || 0 },
            });
          } else {
            await prisma.productVariant.update({ where: { id: variant.id }, data: { size: vSize, color: vColor, supplierCost: vPrice || 0, inventoryCount: vInv || 0 } });
          }
          await prisma.vendorProductVariant.update({ where: { id: vpv.id }, data: { productVariantId: variant.id } });

          processed++;
          await prisma.importJob.update({ where: { id: jobId }, data: { processedRows: processed, createdCount: created, updatedCount: updated } });
        } catch (rowErr: any) {
          failed++;
          await prisma.importJobError.create({ data: { jobId, rowNumber, message: rowErr?.message || String(rowErr), rawRow: row } });
          await prisma.importJob.update({ where: { id: jobId }, data: { failedRows: failed, processedRows: processed } });
          logger.warn(`Import row ${rowNumber} failed: ${rowErr?.message || rowErr}`);
        }
      }

      const status = failed > 0 && processed > 0 ? 'SUCCESS' : 'SUCCESS';
      await prisma.importJob.update({ where: { id: jobId }, data: { status, finishedAt: new Date() } });
      logger.info(`Import job ${jobId} completed: processed=${processed}, created=${created}, updated=${updated}, failed=${failed}`);
    } catch (err: any) {
      await prisma.importJob.update({ where: { id: jobId }, data: { status: 'FAILED', error: err?.stack || err?.message || String(err), finishedAt: new Date() } });
      logger.error(`Import job ${jobId} failed: ${err?.stack || err}`);
    }
  }
}

export default new VendorImportService();