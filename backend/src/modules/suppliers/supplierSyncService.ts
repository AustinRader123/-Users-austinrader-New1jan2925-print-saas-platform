import axios from 'axios';
import fs from 'fs';
import {
  FileAssetKind,
  Prisma,
  SupplierConnection,
  SupplierSyncErrorScope,
  SupplierSyncStatus,
} from '@prisma/client';
import path from 'path';
import prisma from '../../lib/prisma.js';
import storageProvider from '../../services/StorageProvider.js';
import { getSupplierAdapter } from './adapters/index.js';
import { decryptSupplierCredentials } from './credentials.js';
import { ExternalSupplierImage, ExternalSupplierProduct, SupplierSyncOptions } from './types.js';
import SupplierRunLogger from './supplierRunLogger.js';

export type SupplierSyncResult = {
  runId: string;
  status: SupplierSyncStatus;
  counts: {
    productsCreated: number;
    productsUpdated: number;
    variantsCreated: number;
    variantsUpdated: number;
    imagesCreated: number;
    imagesUpdated: number;
  };
  errorSummary?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);

const fallbackSlug = (externalProductId: string) => `supplier-${slugify(externalProductId || 'product')}`;

function fromDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer; ext: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URL');
  }
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const ext = mimeType.split('/')[1] || 'bin';
  return { mimeType, buffer, ext };
}

async function loadImage(url: string): Promise<{ buffer: Buffer; mimeType: string; ext: string }> {
  if (url.startsWith('data:')) {
    return fromDataUrl(url);
  }
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
  });
  const mimeType = response.headers['content-type'] || 'application/octet-stream';
  const ext = mimeType.split('/')[1] || path.extname(url).replace('.', '') || 'bin';
  return {
    buffer: Buffer.from(response.data),
    mimeType,
    ext,
  };
}

async function mirrorImage(
  storeId: string,
  userId: string | undefined,
  image: ExternalSupplierImage,
  supplierFolder: string
) {
  const loaded = await loadImage(image.url);
  const stored = await storageProvider.uploadFile(
    loaded.buffer,
    `${image.externalImageId}.${loaded.ext}`,
    supplierFolder
  );

  const file = await prisma.fileAsset.create({
    data: {
      storeId,
      kind: FileAssetKind.SUPPLIER_IMAGE,
      fileName: stored.fileName,
      mimeType: loaded.mimeType,
      url: stored.url,
      sizeBytes: stored.size,
      metadata: {
        source: 'supplier-sync',
        externalImageId: image.externalImageId,
      },
      createdById: userId,
    },
  });

  return {
    fileId: file.id,
    mirroredUrl: stored.url,
  };
}

export async function recordSupplierSyncError(params: {
  storeId: string;
  runId: string;
  scope: SupplierSyncErrorScope;
  message: string;
  meta?: Prisma.InputJsonValue;
}) {
  await prisma.supplierSyncRunError.create({
    data: {
      storeId: params.storeId,
      syncRunId: params.runId,
      scope: params.scope,
      message: params.message,
      meta: params.meta,
    },
  });
}

export class SupplierSyncService {
  async createRun(connection: SupplierConnection) {
    return prisma.supplierSyncRun.create({
      data: {
        storeId: connection.storeId,
        supplierConnectionId: connection.id,
        status: 'QUEUED',
      },
    });
  }

  async runSync(runId: string, options?: SupplierSyncOptions & { userId?: string }): Promise<SupplierSyncResult> {
    const run = await prisma.supplierSyncRun.findUnique({
      where: { id: runId },
      include: { supplierConnection: true },
    });

    if (!run) {
      throw new Error('Supplier sync run not found');
    }

    const connection = run.supplierConnection;
    const adapter = getSupplierAdapter(connection.supplier);
    const runLogger = new SupplierRunLogger(runId);
    const startedAt = new Date();

    await prisma.supplierSyncRun.update({
      where: { id: runId },
      data: {
        status: 'RUNNING',
        startedAt,
        attempts: { increment: 1 },
      },
    });

    runLogger.info('Supplier sync started', {
      supplier: connection.supplier,
      supplierConnectionId: connection.id,
      storeId: connection.storeId,
      includeImages: options?.includeImages !== false,
      limitProducts: options?.limitProducts,
    });

    const counts = {
      productsCreated: 0,
      productsUpdated: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      imagesCreated: 0,
      imagesUpdated: 0,
    };

    try {
      const credentials = decryptSupplierCredentials(connection.credentialsEncrypted);
      if (!credentials || Object.keys(credentials).length === 0) {
        await recordSupplierSyncError({
          storeId: connection.storeId,
          runId,
          scope: 'AUTH',
          message: 'Missing supplier credentials',
        });
        runLogger.error('Missing supplier credentials');
        throw new Error('Missing supplier credentials');
      }

      const products = await adapter.fetchCatalog(
        {
          id: connection.id,
          supplier: connection.supplier,
          baseUrl: connection.baseUrl,
          credentials,
        },
        options
      );

      runLogger.info('Fetched supplier catalog', {
        productCount: products.length,
      });

      for (const externalProduct of products) {
        await this.upsertExternalProduct(connection, runId, externalProduct, counts, options?.userId, options?.includeImages !== false);
      }

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      runLogger.info('Supplier sync completed', {
        durationMs,
        counts,
      });
      const logFile = await this.persistRunLog(connection.storeId, options?.userId, runId, runLogger.filePath);
      await prisma.supplierSyncRun.update({
        where: { id: runId },
        data: {
          status: 'SUCCEEDED',
          finishedAt,
          durationMs,
          counts,
          logFileId: logFile?.id,
        },
      });

      await prisma.supplierConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: finishedAt },
      });

      return { runId, status: 'SUCCEEDED', counts };
    } catch (error: any) {
      const message = error?.message || 'Supplier sync failed';
      await recordSupplierSyncError({
        storeId: connection.storeId,
        runId,
        scope: message.toLowerCase().includes('credential') ? 'AUTH' : 'FETCH',
        message,
        meta: {
          stack: error?.stack,
        },
      });

      runLogger.error('Supplier sync failed', { message, stack: error?.stack });

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const logFile = await this.persistRunLog(connection.storeId, options?.userId, runId, runLogger.filePath);
      await prisma.supplierSyncRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          finishedAt,
          durationMs,
          errorSummary: message,
          counts,
          logFileId: logFile?.id,
        },
      });

      return {
        runId,
        status: 'FAILED',
        counts,
        errorSummary: message,
      };
    }
  }

  private async persistRunLog(storeId: string, userId: string | undefined, runId: string, localLogPath: string) {
    if (!fs.existsSync(localLogPath)) return null;
    const buffer = fs.readFileSync(localLogPath);
    const stored = await storageProvider.uploadFile(buffer, `${runId}.log`, 'supplier-sync-logs');
    return prisma.fileAsset.create({
      data: {
        storeId,
        kind: FileAssetKind.SUPPLIER_SYNC_LOG,
        fileName: stored.fileName,
        mimeType: 'text/plain',
        url: stored.url,
        sizeBytes: stored.size,
        metadata: { runId, source: 'supplier-sync' },
        createdById: userId,
      },
    });
  }

  private async upsertExternalProduct(
    connection: SupplierConnection,
    runId: string,
    externalProduct: ExternalSupplierProduct,
    counts: SupplierSyncResult['counts'],
    userId: string | undefined,
    includeImages: boolean
  ) {
    const existingProductMap = await prisma.externalProductMap.findUnique({
      where: {
        supplierConnectionId_externalProductId: {
          supplierConnectionId: connection.id,
          externalProductId: externalProduct.externalProductId,
        },
      },
      include: { product: true },
    });

    const slugBase = slugify(externalProduct.name || externalProduct.externalProductId) || fallbackSlug(externalProduct.externalProductId);
    const product = existingProductMap?.product
      ? await prisma.product.update({
          where: { id: existingProductMap.product.id },
          data: {
            name: externalProduct.name,
            description: externalProduct.description,
            category: externalProduct.category,
            tags: externalProduct.tags || [],
            active: externalProduct.active ?? true,
            status: externalProduct.active === false ? 'ARCHIVED' : 'ACTIVE',
            basePrice: externalProduct.variants[0]?.price ?? existingProductMap.product.basePrice,
          },
        })
      : await prisma.product.create({
          data: {
            storeId: connection.storeId,
            name: externalProduct.name,
            slug: `${slugBase}-${connection.supplier.toLowerCase()}`,
            description: externalProduct.description,
            category: externalProduct.category,
            tags: externalProduct.tags || [],
            active: externalProduct.active ?? true,
            status: externalProduct.active === false ? 'ARCHIVED' : 'ACTIVE',
            basePrice: externalProduct.variants[0]?.price ?? 0,
            type: 'BLANK',
          },
        });

    if (existingProductMap) {
      counts.productsUpdated += 1;
    } else {
      counts.productsCreated += 1;
      await prisma.externalProductMap.create({
        data: {
          storeId: connection.storeId,
          supplierConnectionId: connection.id,
          externalProductId: externalProduct.externalProductId,
          productId: product.id,
          externalMeta: {
            runId,
            brand: externalProduct.brand,
          },
        },
      });
    }

    for (const externalVariant of externalProduct.variants) {
      const existingVariantMap = await prisma.externalVariantMap.findUnique({
        where: {
          supplierConnectionId_externalVariantId: {
            supplierConnectionId: connection.id,
            externalVariantId: externalVariant.externalVariantId,
          },
        },
      });

      if (existingVariantMap) {
        await prisma.productVariant.update({
          where: { id: existingVariantMap.variantId },
          data: {
            name: externalVariant.name,
            sku: externalVariant.sku,
            size: externalVariant.size,
            color: externalVariant.color,
            cost: externalVariant.cost ?? 0,
            supplierCost: externalVariant.cost ?? 0,
            price: externalVariant.price ?? 0,
            inventoryQty: externalVariant.inventoryQty ?? 0,
            supplierInventoryQty: externalVariant.inventoryQty,
            inventoryCount: externalVariant.inventoryQty ?? 0,
            externalId: externalVariant.externalVariantId,
          },
        });
        counts.variantsUpdated += 1;
      } else {
        const createdVariant = await prisma.productVariant.create({
          data: {
            storeId: connection.storeId,
            productId: product.id,
            name: externalVariant.name,
            sku: externalVariant.sku,
            size: externalVariant.size,
            color: externalVariant.color,
            cost: externalVariant.cost ?? 0,
            supplierCost: externalVariant.cost ?? 0,
            price: externalVariant.price ?? 0,
            inventoryQty: externalVariant.inventoryQty ?? 0,
            supplierInventoryQty: externalVariant.inventoryQty,
            inventoryCount: externalVariant.inventoryQty ?? 0,
            externalId: externalVariant.externalVariantId,
          },
        });
        await prisma.externalVariantMap.create({
          data: {
            storeId: connection.storeId,
            supplierConnectionId: connection.id,
            externalVariantId: externalVariant.externalVariantId,
            variantId: createdVariant.id,
            externalMeta: { runId },
          },
        });
        counts.variantsCreated += 1;
      }
    }

    if (!includeImages) {
      return;
    }

    for (const externalImage of externalProduct.images || []) {
      const existingImageMap = await prisma.externalImageMap.findUnique({
        where: {
          supplierConnectionId_externalImageId: {
            supplierConnectionId: connection.id,
            externalImageId: externalImage.externalImageId,
          },
        },
        include: {
          productImage: true,
        },
      });

      const mirrored = await mirrorImage(
        connection.storeId,
        userId,
        externalImage,
        `supplier-sync/${connection.id}`
      );

      if (existingImageMap) {
        await prisma.productImage.update({
          where: { id: existingImageMap.productImageId },
          data: {
            url: mirrored.mirroredUrl,
            path: mirrored.mirroredUrl,
            altText: externalImage.altText,
            position: externalImage.position ?? existingImageMap.productImage.position,
            sortOrder: externalImage.position ?? existingImageMap.productImage.sortOrder,
          },
        });

        await prisma.externalImageMap.update({
          where: { id: existingImageMap.id },
          data: {
            fileId: mirrored.fileId,
            externalMeta: { runId },
          },
        });

        counts.imagesUpdated += 1;
      } else {
        const createdImage = await prisma.productImage.create({
          data: {
            storeId: connection.storeId,
            productId: product.id,
            url: mirrored.mirroredUrl,
            path: mirrored.mirroredUrl,
            altText: externalImage.altText,
            position: externalImage.position ?? 0,
            sortOrder: externalImage.position ?? 0,
          },
        });

        await prisma.externalImageMap.create({
          data: {
            storeId: connection.storeId,
            supplierConnectionId: connection.id,
            externalImageId: externalImage.externalImageId,
            fileId: mirrored.fileId,
            productImageId: createdImage.id,
            externalMeta: { runId },
          },
        });
        counts.imagesCreated += 1;
      }
    }
  }
}

export default new SupplierSyncService();
