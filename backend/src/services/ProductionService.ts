import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import StorageProvider from './StorageProvider.js';
import WebhookService from './WebhookService.js';

const prisma = new PrismaClient();

export class ProductionService {
  private async createSimpleWorkOrderPdf(input: {
    companyName?: string | null;
    supportEmail?: string | null;
    jobNumber: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    qrPng: Buffer;
    items: Array<{ product: string; variant: string; quantity: number }>;
    notes?: string | null;
  }): Promise<Buffer> {
    return await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(input.companyName || 'Production Work Order', { align: 'left' });
      if (input.supportEmail) {
        doc.fontSize(10).text(`Support: ${input.supportEmail}`);
      }
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Job: ${input.jobNumber}`);
      doc.text(`Order: ${input.orderNumber}`);
      doc.text(`Customer: ${input.customerName} (${input.customerEmail})`);
      doc.text(`Generated: ${new Date().toISOString()}`);

      doc.moveDown(1);
      doc.fontSize(13).text('Items');
      doc.moveDown(0.5);
      for (const item of input.items) {
        doc.fontSize(11).text(`- ${item.product} / ${item.variant} x ${item.quantity}`);
      }

      if (input.notes) {
        doc.moveDown(1);
        doc.fontSize(13).text('Notes');
        doc.fontSize(11).text(input.notes);
      }

      doc.moveDown(1);
      doc.fontSize(12).text('Scan QR for job reference');
      doc.image(input.qrPng, doc.x, doc.y + 8, { fit: [120, 120] });

      doc.end();
    });
  }

  async createProductionJob(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new Error('Order not found');

    const jobNumber = `JOB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const job = await prisma.productionJob.create({
      data: {
        orderId,
        jobNumber,
        status: 'QUEUED',
        priority: 'NORMAL',
      },
    });

    // Create initial steps
    const steps = [
      { step: 'artwork_review', status: 'PENDING' },
      { step: 'setup', status: 'PENDING' },
      { step: 'production' as any, status: 'PENDING' as any },
      { step: 'quality_check' as any, status: 'PENDING' as any },
      { step: 'packing' as any, status: 'PENDING' as any },
    ];

    for (const stepData of steps) {
      await prisma.productionStep.create({
        data: {
          jobId: job.id,
          ...stepData,
        },
      });
    }

    return job;
  }

  async ensureCompatJobForOrder(orderId: string) {
    const existing = await prisma.productionJob.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;
    return this.createProductionJob(orderId);
  }

  async getProductionJob(jobId: string) {
    return prisma.productionJob.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
                design: true,
              },
            },
          },
        },
        steps: { orderBy: { createdAt: 'asc' } },
        shipments: true,
      },
    });
  }

  async updateJobStatus(jobId: string, status: string) {
    const updated = await prisma.productionJob.update({
      where: { id: jobId },
      data: {
        status: status as any,
        ...(status === 'IN_PRODUCTION' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });

    const order = await prisma.order.findUnique({ where: { id: updated.orderId }, select: { storeId: true } });
    if (order?.storeId) {
      await WebhookService.publish({
        storeId: order.storeId,
        eventType: 'production.job.status_changed',
        payload: { jobId: updated.id, orderId: updated.orderId, status: updated.status },
      });
    }

    return updated;
  }

  async updateStepStatus(stepId: string, status: string, completedBy?: string, notes?: string) {
    return prisma.productionStep.update({
      where: { id: stepId },
      data: {
        status: status as any,
        completedBy,
        notes,
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
  }

  async listProductionJobs(storeId: string, filter: any = {}) {
    const where: any = {
      order: { storeId },
    };

    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;

    return prisma.productionJob.findMany({
      where,
      include: {
        order: { include: { items: true } },
        steps: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: filter.skip || 0,
      take: filter.take || 20,
    });
  }

  async getProductionKanban(storeId: string) {
    const jobs = await prisma.productionJob.findMany({
      where: {
        order: { storeId },
        status: { not: 'COMPLETED' },
      },
      include: {
        order: { include: { items: true } },
        steps: true,
      },
    });

    // Group by status
    const kanban: Record<string, any[]> = {
      QUEUED: [],
      ARTWORK_REVIEW: [],
      IN_PRODUCTION: [],
      QUALITY_CHECK: [],
      READY_TO_PACK: [],
      PACKED: [],
    };

    for (const job of jobs) {
      if (kanban[job.status]) {
        kanban[job.status].push(job);
      }
    }

    return kanban;
  }

  async createShipment(jobId: string, carrier: string, trackingNumber: string, weight?: number, cost?: number) {
    const job = await prisma.productionJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    return prisma.shipment.create({
      data: {
        orderId: job.orderId,
        productionJobId: jobId,
        carrier,
        trackingNumber,
        weight,
        cost,
        status: 'pending',
      },
    });
  }

  async updateShipmentStatus(shipmentId: string, status: string) {
    return prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status,
        ...(status === 'shipped' && { shippedAt: new Date() }),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
      },
    });
  }

  async generateWorkOrder(jobId: string, userId?: string) {
    const job = await prisma.productionJob.findUnique({
      where: { id: jobId },
      include: {
        order: {
          include: {
            store: true,
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

    if (!job) {
      throw new Error('Production job not found');
    }

    const qrPayload = JSON.stringify({ jobId: job.id, orderId: job.orderId, jobNumber: job.jobNumber });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 280 });
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(qrBase64, 'base64');
    const branding = await (prisma as any).storeBranding.findUnique({ where: { storeId: job.order.storeId } });

    const pdfBuffer = await this.createSimpleWorkOrderPdf({
      companyName: branding?.companyName || job.order.store.name,
      supportEmail: branding?.supportEmail || null,
      jobNumber: job.jobNumber,
      orderNumber: job.order.orderNumber,
      customerName: job.order.customerName,
      customerEmail: job.order.customerEmail,
      qrPng: qrBuffer,
      notes: job.notes,
      items: job.order.items.map((item) => ({
        product: item.product.name,
        variant: item.productVariant.name,
        quantity: item.quantity,
      })),
    });

    const qrFile = await StorageProvider.uploadFile(qrBuffer, `qr_${job.jobNumber}.png`, 'work-orders');
    const pdfFile = await StorageProvider.uploadFile(pdfBuffer, `work_order_${job.jobNumber}.pdf`, 'work-orders');

    const qrAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: job.order.storeId,
        orderId: job.orderId,
        productionJobId: job.id,
        kind: 'QR_CODE',
        fileName: qrFile.fileName,
        mimeType: 'image/png',
        url: qrFile.url,
        sizeBytes: qrFile.size,
        createdById: userId,
      },
    });

    const pdfAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: job.order.storeId,
        orderId: job.orderId,
        productionJobId: job.id,
        kind: 'WORK_ORDER_PDF',
        fileName: pdfFile.fileName,
        mimeType: 'application/pdf',
        url: pdfFile.url,
        sizeBytes: pdfFile.size,
        createdById: userId,
        metadata: { qrAssetId: qrAsset.id },
      },
    });

    await prisma.productionJob.update({
      where: { id: job.id },
      data: {
        workOrderFileId: pdfAsset.id,
        workOrderUrl: pdfFile.url,
      },
    });

    return {
      jobId: job.id,
      workOrderUrl: pdfFile.url,
      qrUrl: qrFile.url,
      workOrderFileId: pdfAsset.id,
    };
  }
}

export default new ProductionService();
