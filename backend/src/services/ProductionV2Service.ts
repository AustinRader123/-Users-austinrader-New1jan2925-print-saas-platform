import crypto from 'crypto';
import path from 'path';
import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import StorageProvider from './StorageProvider.js';

const STAGE_SEQUENCE = [
  'ART',
  'APPROVED',
  'PRINT',
  'CURE',
  'PACK',
  'SHIP',
  'COMPLETE',
] as const;

type Stage = (typeof STAGE_SEQUENCE)[number] | 'HOLD' | 'CANCELLED';
type Method = 'DTF' | 'EMBROIDERY' | 'SCREEN' | 'OTHER';

type BatchItemSeed = {
  orderId?: string | null;
  bulkOrderId?: string | null;
  productId: string;
  variantId: string;
  designId?: string | null;
  location: string;
  qty: number;
  method: Method;
  personalizationSummary?: any;
  assetRef?: any;
};

type ZipEntry = { name: string; data: Buffer };

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

function normalizeMethod(input?: string | null): Method {
  const value = String(input || '').trim().toUpperCase();
  if (!value) return 'DTF';
  if (value.includes('EMBROID')) return 'EMBROIDERY';
  if (value.includes('SCREEN')) return 'SCREEN';
  if (value.includes('DTF')) return 'DTF';
  return 'OTHER';
}

function normalizeLocation(input: any): string {
  if (Array.isArray(input) && input.length > 0) return String(input[0]).toLowerCase();
  if (typeof input === 'string' && input.trim()) return input.trim().toLowerCase();
  return 'front';
}

function nextStage(current: Stage): Stage | null {
  if (current === 'HOLD' || current === 'CANCELLED' || current === 'COMPLETE') return null;
  const idx = STAGE_SEQUENCE.indexOf(current as any);
  if (idx < 0 || idx + 1 >= STAGE_SEQUENCE.length) return null;
  return STAGE_SEQUENCE[idx + 1] as Stage;
}

function transitionEventType(toStage: Stage):
  | 'STAGE_CHANGED'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'HOLD'
  | 'CANCELLED' {
  if (toStage === 'SHIP') return 'SHIPPED';
  if (toStage === 'COMPLETE') return 'COMPLETED';
  if (toStage === 'HOLD') return 'HOLD';
  if (toStage === 'CANCELLED') return 'CANCELLED';
  return 'STAGE_CHANGED';
}

function stableStringify(value: any): string {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${k}:${stableStringify(value[k])}`).join(',')}}`;
}

export class ProductionV2Service {
  async listBatches(input: {
    tenantId: string;
    stage?: string;
    method?: string;
    storeId?: string;
    campaignId?: string;
    q?: string;
  }) {
    const where: any = {
      store: { tenantId: input.tenantId },
      ...(input.stage ? { stage: String(input.stage).toUpperCase() } : {}),
      ...(input.method ? { method: normalizeMethod(input.method) } : {}),
      ...(input.storeId ? { storeId: input.storeId } : {}),
    };

    if (input.campaignId) {
      where.OR = [
        { items: { some: { order: { fundraiserCampaignId: input.campaignId } } } },
        { items: { some: { bulkOrder: { campaignId: input.campaignId } } } },
      ];
    }

    if (input.q?.trim()) {
      const q = input.q.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { id: { contains: q, mode: 'insensitive' } },
            { sourceId: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return (prisma as any).productionBatch.findMany({
      where,
      include: {
        _count: { select: { items: true, events: true } },
        assignments: {
          where: { releasedAt: null },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getBatch(tenantId: string, batchId: string) {
    const batch = await (prisma as any).productionBatch.findFirst({
      where: { id: batchId, store: { tenantId } },
      include: {
        store: { select: { id: true, name: true, slug: true } },
        network: { select: { id: true, name: true } },
        fulfillmentStore: { select: { id: true, name: true, slug: true } },
        items: {
          include: {
            order: { select: { id: true, orderNumber: true, fundraiserCampaignId: true } },
            bulkOrder: { select: { id: true, campaignId: true } },
            product: { select: { id: true, name: true } },
            variant: { select: { id: true, name: true, sku: true, color: true, size: true } },
            design: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        events: {
          include: { actorUser: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { assignedAt: 'desc' },
        },
        scanTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!batch) throw new Error('Batch not found for tenant');
    return batch;
  }

  private async createScanToken(batchId: string, expiresAt?: Date | null) {
    const token = crypto.randomBytes(24).toString('hex');
    return (prisma as any).productionScanToken.create({
      data: {
        batchId,
        token,
        expiresAt: expiresAt || null,
      },
    });
  }

  private async ensureActiveScanToken(batchId: string) {
    const existing = await (prisma as any).productionScanToken.findFirst({
      where: {
        batchId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return existing;
    return this.createScanToken(batchId, null);
  }

  private buildBatchingKey(input: BatchItemSeed) {
    const personalizationSignature = stableStringify(input.personalizationSummary || null);
    return [
      input.method,
      input.location,
      input.productId,
      input.variantId,
      input.designId || '',
      personalizationSignature,
    ].join('|');
  }

  private extractAssetRefs(orderItem: any) {
    const urls: string[] = [];
    const pushIf = (value: any) => {
      const v = String(value || '').trim();
      if (v) urls.push(v);
    };

    pushIf(orderItem?.mockupPreviewUrl);
    pushIf(orderItem?.mockupUrl);

    if (orderItem?.exportAssets && Array.isArray(orderItem.exportAssets)) {
      for (const val of orderItem.exportAssets) pushIf(val);
    } else if (orderItem?.exportAssets && typeof orderItem.exportAssets === 'object') {
      Object.values(orderItem.exportAssets).forEach((val) => {
        if (Array.isArray(val)) val.forEach((v) => pushIf(v));
        else pushIf(val);
      });
    }

    return { urls: Array.from(new Set(urls)) };
  }

  private async createBatchesFromItems(input: {
    storeId: string;
    networkId?: string | null;
    fulfillmentStoreId?: string | null;
    sourceType: 'ORDER' | 'BULK_ORDER';
    sourceId: string;
    items: BatchItemSeed[];
    actorUserId?: string | null;
  }) {
    const existing = await (prisma as any).productionBatch.findMany({
      where: {
        storeId: input.storeId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        assignments: true,
        scanTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (existing.length) return existing;

    const grouped = new Map<string, BatchItemSeed[]>();
    for (const item of input.items) {
      const key = this.buildBatchingKey(item);
      const group = grouped.get(key) || [];
      group.push(item);
      grouped.set(key, group);
    }

    const createdBatchIds: string[] = [];

    for (const group of grouped.values()) {
      const first = group[0];
      const batch = await (prisma as any).productionBatch.create({
        data: {
          storeId: input.storeId,
          networkId: input.networkId || null,
          fulfillmentStoreId: input.fulfillmentStoreId || null,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
          method: first.method,
          stage: 'ART',
          priority: 'NORMAL',
          notes: `Auto-created from ${input.sourceType}:${input.sourceId}`,
        },
      });

      await (prisma as any).productionBatchItem.createMany({
        data: group.map((item) => ({
          batchId: batch.id,
          orderId: item.orderId || null,
          bulkOrderId: item.bulkOrderId || null,
          productId: item.productId,
          variantId: item.variantId,
          designId: item.designId || null,
          location: item.location,
          qty: item.qty,
          personalizationSummary: item.personalizationSummary || null,
          assetRef: item.assetRef || null,
        })),
      });

      await (prisma as any).productionBatchEvent.create({
        data: {
          batchId: batch.id,
          type: 'CREATED',
          toStage: 'ART',
          actorUserId: input.actorUserId || null,
          meta: {
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            itemCount: group.length,
          },
        },
      });

      await this.createScanToken(batch.id, null);
      createdBatchIds.push(batch.id);
    }

    return (prisma as any).productionBatch.findMany({
      where: { id: { in: createdBatchIds } },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        assignments: true,
        scanTokens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBatchesFromOrder(orderId: string, actorUserId?: string | null) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        routedOrder: true,
        items: {
          include: {
            product: { include: { decorationAreas: true } },
            productVariant: true,
            design: true,
          },
        },
      },
    });

    if (!order) throw new Error('Order not found');

    const seeds: BatchItemSeed[] = (order.items as any[]).map((item) => {
      const methodFromProduct = (item.product?.decorationAreas || [])[0]?.printMethod;
      const method = normalizeMethod(item.decorationMethod || methodFromProduct || null);
      const location = normalizeLocation(item.decorationLocations);
      return {
        orderId: order.id,
        productId: item.productId,
        variantId: item.productVariantId,
        designId: item.designId || null,
        location,
        qty: Number(item.quantity || 0),
        method,
        personalizationSummary: item.customizationJson || null,
        assetRef: this.extractAssetRefs(item),
      };
    });

    const networkId = (order as any).routedOrder?.networkId || null;
    return this.createBatchesFromItems({
      storeId: order.storeId,
      networkId,
      fulfillmentStoreId: order.fulfillmentStoreId || null,
      sourceType: 'ORDER',
      sourceId: order.id,
      items: seeds,
      actorUserId,
    });
  }

  async createBatchesFromCampaignBulkOrder(bulkOrderId: string, actorUserId?: string | null) {
    const run = await (prisma as any).fundraiserConsolidationRun.findUnique({
      where: { id: bulkOrderId },
      include: {
        campaign: true,
        lines: {
          include: {
            order: {
              include: {
                items: {
                  include: {
                    product: { include: { decorationAreas: true } },
                    productVariant: true,
                    design: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) throw new Error('Bulk order not found');

    const seeds: BatchItemSeed[] = [];
    for (const line of run.lines as any[]) {
      const order = line.order;
      for (const item of order.items as any[]) {
        const methodFromProduct = (item.product?.decorationAreas || [])[0]?.printMethod;
        const method = normalizeMethod(item.decorationMethod || methodFromProduct || null);
        const location = normalizeLocation(item.decorationLocations);
        seeds.push({
          orderId: order.id,
          bulkOrderId: run.id,
          productId: item.productId,
          variantId: item.productVariantId,
          designId: item.designId || null,
          location,
          qty: Number(item.quantity || 0),
          method,
          personalizationSummary: item.customizationJson || null,
          assetRef: this.extractAssetRefs(item),
        });
      }
    }

    return this.createBatchesFromItems({
      storeId: run.storeId,
      networkId: run.campaign?.networkId || null,
      fulfillmentStoreId: null,
      sourceType: 'BULK_ORDER',
      sourceId: run.id,
      items: seeds,
      actorUserId,
    });
  }

  async assignBatch(tenantId: string, batchId: string, userId: string, actorUserId?: string | null) {
    const batch = await (prisma as any).productionBatch.findFirst({
      where: { id: batchId, store: { tenantId } },
    });
    if (!batch) throw new Error('Batch not found for tenant');

    await (prisma as any).productionAssignment.updateMany({
      where: { batchId, releasedAt: null },
      data: { releasedAt: new Date() },
    });

    const assignment = await (prisma as any).productionAssignment.create({
      data: {
        batchId,
        userId,
        role: 'OPERATOR',
      },
    });

    await (prisma as any).productionBatchEvent.create({
      data: {
        batchId,
        type: 'ASSIGNED',
        actorUserId: actorUserId || null,
        meta: { userId },
      },
    });

    return assignment;
  }

  async unassignBatch(tenantId: string, batchId: string, actorUserId?: string | null) {
    const batch = await (prisma as any).productionBatch.findFirst({
      where: { id: batchId, store: { tenantId } },
    });
    if (!batch) throw new Error('Batch not found for tenant');

    const released = await (prisma as any).productionAssignment.updateMany({
      where: { batchId, releasedAt: null },
      data: { releasedAt: new Date() },
    });

    await (prisma as any).productionBatchEvent.create({
      data: {
        batchId,
        type: 'UNASSIGNED',
        actorUserId: actorUserId || null,
        meta: { releasedCount: released.count },
      },
    });

    return { releasedCount: released.count };
  }

  private assertTransition(fromStage: Stage, toStage: Stage) {
    if (toStage === 'CANCELLED') return;
    if (toStage === 'HOLD') return;

    if (fromStage === 'HOLD') {
      if (!STAGE_SEQUENCE.includes(toStage as any)) {
        throw new Error(`Invalid transition HOLD -> ${toStage}`);
      }
      return;
    }

    if (fromStage === 'CANCELLED' || fromStage === 'COMPLETE') {
      throw new Error(`Cannot transition from ${fromStage}`);
    }

    const expected = nextStage(fromStage);
    if (!expected || expected !== toStage) {
      throw new Error(`Invalid transition ${fromStage} -> ${toStage}`);
    }
  }

  async transitionBatchStage(input: {
    tenantId?: string;
    batchId: string;
    toStage: Stage;
    note?: string;
    actorUserId?: string | null;
  }) {
    const batch = await (prisma as any).productionBatch.findFirst({
      where: {
        id: input.batchId,
        ...(input.tenantId ? { store: { tenantId: input.tenantId } } : {}),
      },
    });

    if (!batch) throw new Error('Batch not found');

    const fromStage = batch.stage as Stage;
    const toStage = input.toStage;
    this.assertTransition(fromStage, toStage);

    const updated = await (prisma as any).productionBatch.update({
      where: { id: batch.id },
      data: {
        stage: toStage,
        ...(input.note ? { notes: [batch.notes, input.note].filter(Boolean).join('\n') } : {}),
      },
    });

    const eventType = transitionEventType(toStage);
    await (prisma as any).productionBatchEvent.create({
      data: {
        batchId: batch.id,
        type: eventType,
        fromStage,
        toStage,
        actorUserId: input.actorUserId || null,
        meta: input.note ? { note: input.note } : null,
      },
    });

    return updated;
  }

  async createTicketHtml(tenantId: string, batchId: string, recordEvent = true) {
    const batch = await this.getBatch(tenantId, batchId);
    const scanToken = await this.ensureActiveScanToken(batch.id);

    const scanUrl = `${process.env.BASE_URL || ''}/api/production-v2/scan/${scanToken.token}`;
    const qrDataUrl = await QRCode.toDataURL(scanUrl || scanToken.token, { margin: 1, width: 256 });

    const totalQty = (batch.items || []).reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0);
    const rows = (batch.items || [])
      .map((item: any) => {
        const orderRef = item.order?.orderNumber || item.orderId || 'n/a';
        return `
          <tr>
            <td>${item.product?.name || item.productId}</td>
            <td>${item.variant?.name || item.variantId}</td>
            <td>${item.location}</td>
            <td>${item.qty}</td>
            <td>${orderRef}</td>
          </tr>
        `;
      })
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Production Ticket ${batch.id}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
    h1 { margin: 0 0 8px; }
    .meta { margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background: #f8f8f8; }
    .qr { margin-top: 12px; width: 170px; }
  </style>
</head>
<body>
  <h1>Production Ticket</h1>
  <div class="meta"><strong>Batch:</strong> ${batch.id}</div>
  <div class="meta"><strong>Stage:</strong> ${batch.stage}</div>
  <div class="meta"><strong>Method:</strong> ${batch.method}</div>
  <div class="meta"><strong>Due:</strong> ${batch.dueAt ? new Date(batch.dueAt).toISOString() : 'n/a'}</div>
  <div class="meta"><strong>Store:</strong> ${batch.store?.name || batch.storeId}</div>
  <div class="meta"><strong>Source:</strong> ${batch.sourceType}:${batch.sourceId}</div>
  <div class="meta"><strong>Total Qty:</strong> ${totalQty}</div>
  <img class="qr" src="${qrDataUrl}" alt="batch scan token" />
  <div class="meta"><strong>Scan:</strong> ${scanUrl}</div>
  <table>
    <thead>
      <tr><th>Product</th><th>Variant</th><th>Location</th><th>Qty</th><th>Order</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

    if (recordEvent) {
      await (prisma as any).productionBatchEvent.create({
        data: {
          batchId: batch.id,
          type: 'TICKET_PRINTED',
          meta: { scanTokenId: scanToken.id },
        },
      });
    }

    return html;
  }

  async exportBatchZip(tenantId: string, batchId: string, actorUserId?: string | null) {
    const batch = await this.getBatch(tenantId, batchId);
    const entries: ZipEntry[] = [];

    const ticketHtml = await this.createTicketHtml(tenantId, batchId, false);
    entries.push({ name: 'ticket.html', data: Buffer.from(ticketHtml, 'utf8') });

    const manifest = {
      batchId: batch.id,
      sourceType: batch.sourceType,
      sourceId: batch.sourceId,
      stage: batch.stage,
      method: batch.method,
      priority: batch.priority,
      dueAt: batch.dueAt,
      createdAt: batch.createdAt,
      items: (batch.items || []).map((item: any) => ({
        id: item.id,
        orderId: item.orderId,
        bulkOrderId: item.bulkOrderId,
        productId: item.productId,
        variantId: item.variantId,
        designId: item.designId,
        location: item.location,
        qty: item.qty,
      })),
    };
    entries.push({ name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') });

    let assetCounter = 0;
    for (const item of batch.items || []) {
      const urls: string[] = Array.isArray((item as any).assetRef?.urls)
        ? (item as any).assetRef.urls
        : [];

      for (const url of urls) {
        try {
          const bytes = await StorageProvider.downloadFile(url);
          const ext = path.extname(String(url)) || '.png';
          const fileName = `assets/${item.id}_${assetCounter}${ext}`;
          entries.push({ name: fileName, data: bytes });
          assetCounter += 1;
        } catch {
          continue;
        }
      }
    }

    const zip = createStoredZip(entries);

    await (prisma as any).productionBatchEvent.create({
      data: {
        batchId: batch.id,
        type: 'EXPORT',
        actorUserId: actorUserId || null,
        meta: { fileCount: entries.length },
      },
    });

    return zip;
  }

  async scanAction(token: string, action: 'advance' | 'hold' | 'cancel' | 'ship' | 'complete', note?: string, actorUserId?: string | null) {
    const scanToken = await (prisma as any).productionScanToken.findUnique({
      where: { token },
      include: { batch: true },
    });

    if (!scanToken?.batch) throw new Error('Invalid scan token');
    if (scanToken.expiresAt && new Date(scanToken.expiresAt).getTime() <= Date.now()) {
      throw new Error('Scan token expired');
    }

    const current = scanToken.batch.stage as Stage;
    let toStage: Stage;

    switch (action) {
      case 'advance': {
        const next = nextStage(current);
        if (!next) throw new Error(`Cannot advance from stage ${current}`);
        toStage = next;
        break;
      }
      case 'hold':
        toStage = 'HOLD';
        break;
      case 'cancel':
        toStage = 'CANCELLED';
        break;
      case 'ship':
        toStage = 'SHIP';
        break;
      case 'complete':
        toStage = 'COMPLETE';
        break;
      default:
        throw new Error('Unsupported scan action');
    }

    await this.transitionBatchStage({
      batchId: scanToken.batch.id,
      toStage,
      note,
      actorUserId,
    });

    return (prisma as any).productionBatch.findUnique({
      where: { id: scanToken.batch.id },
      include: {
        items: true,
        events: { orderBy: { createdAt: 'asc' } },
        assignments: { where: { releasedAt: null }, include: { user: true } },
      },
    });
  }
}

export default new ProductionV2Service();
