import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import StorageProvider from './StorageProvider.js';
import AuditService from './AuditService.js';

const prisma = new PrismaClient();

type DocumentType = 'QUOTE' | 'INVOICE' | 'PROOF' | 'WORK_ORDER';
type RefType = 'QUOTE' | 'ORDER' | 'PROOF_REQUEST' | 'PRODUCTION_JOB';

type Branding = {
  companyName?: string | null;
  supportEmail?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
};

function toPdfBuffer(render: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    render(doc as unknown as PDFKit.PDFDocument);
    doc.end();
  });
}

export class DocumentService {
  async ensureDefaultTemplates(storeId: string) {
    const defaults = [
      { type: 'QUOTE', name: 'default-quote', template: { sections: ['header', 'customer', 'items', 'totals', 'notes'] } },
      { type: 'INVOICE', name: 'default-invoice', template: { sections: ['header', 'billTo', 'items', 'totals', 'payment'] } },
      { type: 'PROOF', name: 'default-proof', template: { sections: ['header', 'artwork', 'approval'] } },
      { type: 'WORK_ORDER', name: 'default-work-order', template: { sections: ['header', 'production', 'shipping'] } },
    ] as const;

    for (const entry of defaults) {
      await (prisma as any).documentTemplate.upsert({
        where: { storeId_type_name: { storeId, type: entry.type, name: entry.name } },
        create: {
          storeId,
          type: entry.type,
          name: entry.name,
          template: entry.template,
          active: true,
        },
        update: {
          active: true,
        },
      });
    }
  }

  private async getBranding(storeId: string): Promise<Branding> {
    const branding = await (prisma as any).storeBranding.findUnique({ where: { storeId } });
    return branding || {
      companyName: 'SkuFlow Store',
      supportEmail: null,
      primaryColor: '#2563EB',
      secondaryColor: '#0F172A',
    };
  }

  private renderHeader(doc: PDFKit.PDFDocument, title: string, branding: Branding) {
    doc.fillColor(branding.primaryColor || '#2563EB').fontSize(20).text(branding.companyName || 'SkuFlow Store');
    doc.fillColor('#111827').fontSize(12).text(title, { align: 'right' });
    if (branding.supportEmail) {
      doc.moveDown(0.2).fontSize(10).fillColor('#4B5563').text(`Support: ${branding.supportEmail}`);
    }
    doc.moveDown();
    doc.strokeColor(branding.secondaryColor || '#0F172A').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown();
  }

  private async createFileAsset(input: {
    storeId: string;
    orderId?: string;
    kind: 'QUOTE_PDF' | 'INVOICE_PDF' | 'PROOF_PDF' | 'WORK_ORDER_PDF';
    fileName: string;
    buffer: Buffer;
    createdById?: string;
    metadata?: Record<string, any>;
  }) {
    const uploaded = await StorageProvider.uploadFile(input.buffer, input.fileName, 'documents');
    return prisma.fileAsset.create({
      data: {
        storeId: input.storeId,
        orderId: input.orderId,
        kind: input.kind as any,
        fileName: uploaded.fileName,
        mimeType: 'application/pdf',
        url: uploaded.url,
        sizeBytes: uploaded.size,
        createdById: input.createdById || null,
        metadata: input.metadata || {},
      },
    });
  }

  private async trackGeneratedDocument(storeId: string, type: DocumentType, refType: RefType, refId: string, fileId: string) {
    return (prisma as any).generatedDocument.create({
      data: {
        storeId,
        type,
        refType,
        refId,
        fileId,
      },
    });
  }

  async generateQuotePdf(quoteId: string, actorUserId?: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: true, store: true },
    });
    if (!quote) throw new Error('Quote not found');

    await this.ensureDefaultTemplates(quote.storeId);
    const branding = await this.getBranding(quote.storeId);

    const buffer = await toPdfBuffer((doc) => {
      this.renderHeader(doc, `Quote ${quote.quoteNumber}`, branding);
      doc.fontSize(11).fillColor('#111827').text(`Customer: ${quote.customerName || 'N/A'}`);
      doc.text(`Email: ${quote.customerEmail || 'N/A'}`);
      doc.text(`Status: ${quote.status}`);
      doc.moveDown();

      quote.lineItems.forEach((item: any, index: number) => {
        doc.fontSize(10).text(`${index + 1}. ${item.description || 'Line Item'} — Qty ${item.quantity} — $${item.lineTotal.toFixed(2)}`);
      });

      doc.moveDown();
      doc.fontSize(12).text(`Subtotal: $${quote.subtotal.toFixed(2)}`);
      doc.fontSize(12).text(`Total: $${quote.total.toFixed(2)}`);
      if (quote.notes) {
        doc.moveDown().fontSize(10).fillColor('#374151').text(`Notes: ${quote.notes}`);
      }
    });

    const fileAsset = await this.createFileAsset({
      storeId: quote.storeId,
      kind: 'QUOTE_PDF',
      fileName: `quote-${quote.quoteNumber}.pdf`,
      buffer,
      createdById: actorUserId,
      metadata: { quoteId },
    });

    const generated = await this.trackGeneratedDocument(quote.storeId, 'QUOTE', 'QUOTE', quote.id, fileAsset.id);
    await AuditService.log({
      tenantId: quote.store.tenantId || '',
      actorType: actorUserId ? 'Admin' : 'System',
      actorUserId: actorUserId,
      action: 'document.generated.quote',
      entityType: 'GeneratedDocument',
      entityId: generated.id,
      meta: { quoteId: quote.id, fileId: fileAsset.id },
    });

    return { generated, fileAsset };
  }

  async generateInvoicePdf(orderId: string, actorUserId?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, store: true },
    });
    if (!order) throw new Error('Order not found');

    await this.ensureDefaultTemplates(order.storeId);
    const branding = await this.getBranding(order.storeId);

    const buffer = await toPdfBuffer((doc) => {
      this.renderHeader(doc, `Invoice ${order.orderNumber}`, branding);
      doc.fontSize(11).fillColor('#111827').text(`Bill To: ${order.customerName}`);
      doc.text(`Email: ${order.customerEmail}`);
      doc.text(`Status: ${order.status}`);
      doc.moveDown();

      order.items.forEach((item: any, index: number) => {
        doc.fontSize(10).text(`${index + 1}. ${item.quantity} × ${item.decorationMethod || 'Item'} — $${item.totalPrice.toFixed(2)}`);
      });

      doc.moveDown();
      doc.fontSize(12).text(`Subtotal: $${order.subtotal.toFixed(2)}`);
      doc.fontSize(12).text(`Tax: $${order.taxAmount.toFixed(2)}`);
      doc.fontSize(12).text(`Shipping: $${order.shippingCost.toFixed(2)}`);
      doc.fontSize(12).text(`Total: $${order.totalAmount.toFixed(2)}`);
    });

    const fileAsset = await this.createFileAsset({
      storeId: order.storeId,
      orderId: order.id,
      kind: 'INVOICE_PDF',
      fileName: `invoice-${order.orderNumber}.pdf`,
      buffer,
      createdById: actorUserId,
      metadata: { orderId },
    });

    const generated = await this.trackGeneratedDocument(order.storeId, 'INVOICE', 'ORDER', order.id, fileAsset.id);
    await AuditService.log({
      tenantId: order.store.tenantId || '',
      actorType: actorUserId ? 'Admin' : 'System',
      actorUserId: actorUserId,
      action: 'document.generated.invoice',
      entityType: 'GeneratedDocument',
      entityId: generated.id,
      meta: { orderId: order.id, fileId: fileAsset.id },
    });

    return { generated, fileAsset };
  }

  async generateProofPdf(approvalId: string, actorUserId?: string) {
    const approval = await prisma.proofApproval.findUnique({
      where: { id: approvalId },
      include: { store: true, order: true },
    });
    if (!approval) throw new Error('Proof request not found');

    await this.ensureDefaultTemplates(approval.storeId);
    const branding = await this.getBranding(approval.storeId);

    const buffer = await toPdfBuffer((doc) => {
      this.renderHeader(doc, `Proof Request ${approval.id.slice(0, 8)}`, branding);
      doc.fontSize(11).fillColor('#111827').text(`Order: ${approval.order.orderNumber}`);
      doc.text(`Recipient: ${approval.recipientEmail || 'N/A'}`);
      doc.text(`Status: ${approval.status}`);
      doc.text(`Message: ${approval.message || ''}`);
      doc.moveDown();
      if (approval.responseComment) doc.text(`Response: ${approval.responseComment}`);
    });

    const fileAsset = await this.createFileAsset({
      storeId: approval.storeId,
      orderId: approval.orderId,
      kind: 'PROOF_PDF',
      fileName: `proof-${approval.id}.pdf`,
      buffer,
      createdById: actorUserId,
      metadata: { approvalId },
    });

    const generated = await this.trackGeneratedDocument(approval.storeId, 'PROOF', 'PROOF_REQUEST', approval.id, fileAsset.id);
    await AuditService.log({
      tenantId: approval.store.tenantId || '',
      actorType: actorUserId ? 'Admin' : 'System',
      actorUserId: actorUserId,
      action: 'document.generated.proof',
      entityType: 'GeneratedDocument',
      entityId: generated.id,
      meta: { approvalId: approval.id, fileId: fileAsset.id },
    });

    return { generated, fileAsset };
  }
}

export default new DocumentService();
