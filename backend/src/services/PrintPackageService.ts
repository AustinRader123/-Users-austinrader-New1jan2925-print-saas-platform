import path from 'path';
import { PrismaClient } from '@prisma/client';
import StorageProvider from './StorageProvider.js';

const prisma: any = new PrismaClient();

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrc32Table();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    const byte = buffer[i];
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  name: string;
  data: Buffer;
};

function createStoredZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const localDir = Buffer.concat(localParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(localDir.length, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([localDir, centralDir, end]);
}

export class PrintPackageService {
  async generateForProductionJob(jobId: string, userId?: string) {
    const job = await prisma.productionJob.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
              },
            },
          },
        },
      },
    });

    if (!job) throw new Error('Production job not found');

    const manifest: Record<string, any> = {
      jobId: job.id,
      jobNumber: job.jobNumber,
      orderId: job.orderId,
      orderNumber: job.order.orderNumber,
      createdAt: new Date().toISOString(),
      items: [],
    };

    const entries: ZipEntry[] = [];

    for (const item of job.order.items as any[]) {
      const itemRow: Record<string, any> = {
        orderItemId: item.id,
        productName: item.product?.name,
        variantName: item.productVariant?.name,
        quantity: item.quantity,
        customizationId: item.customizationId || null,
      };

      const previewUrl = item.mockupPreviewUrl || item.mockupUrl || null;
      if (previewUrl) {
        const previewBytes = await StorageProvider.downloadFile(previewUrl);
        const ext = path.extname(previewUrl) || '.png';
        const name = `artworks/${item.id}${ext}`;
        entries.push({ name, data: previewBytes });
        itemRow.previewPath = name;
      }

      itemRow.customization = item.customizationJson || item.pricingSnapshot?.customization || null;
      manifest.items.push(itemRow);
    }

    entries.push({
      name: 'manifest.json',
      data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'),
    });

    const zipBuffer = createStoredZip(entries);
    const uploaded = await StorageProvider.uploadFile(zipBuffer, `print_package_${job.jobNumber}.zip`, 'production/print-packages');

    const fileAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: job.order.storeId,
        orderId: job.orderId,
        productionJobId: job.id,
        kind: 'PRINT_PACKAGE_ZIP',
        fileName: uploaded.fileName,
        mimeType: 'application/zip',
        url: uploaded.url,
        sizeBytes: uploaded.size,
        createdById: userId || null,
        metadata: { jobId: job.id, orderId: job.orderId },
      },
    });

    const customizations = (job.order.items as any[])
      .map((item) => (item.customizationId || item.pricingSnapshot?.customizationId) as string | null)
      .filter((id): id is string => Boolean(id));

    const records = [] as any[];
    for (const customizationId of customizations) {
      const created = await (prisma as any).printPackage.create({
        data: {
          storeId: job.order.storeId,
          orderId: job.orderId,
          productionJobId: job.id,
          customizationId,
          fileId: fileAsset.id,
          metadata: {
            jobNumber: job.jobNumber,
            lineItemCustomizationId: customizationId,
          },
        },
      });
      records.push(created);

      await (prisma as any).customization.update({ where: { id: customizationId }, data: { status: 'PACKAGED' } });
    }

    if (records.length === 0) {
      const created = await (prisma as any).printPackage.create({
        data: {
          storeId: job.order.storeId,
          orderId: job.orderId,
          productionJobId: job.id,
          fileId: fileAsset.id,
          metadata: { jobNumber: job.jobNumber },
        },
      });
      records.push(created);
    }

    return {
      jobId: job.id,
      fileId: fileAsset.id,
      url: fileAsset.url,
      packages: records,
    };
  }
}

export default new PrintPackageService();
