import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import WebhookService from './WebhookService.js';
import AuditService from './AuditService.js';

const prisma = new PrismaClient();

export class ProofService {
  private createToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  async createRequest(input: {
    storeId: string;
    orderId: string;
    designId?: string;
    mockupId?: string;
    recipientEmail?: string;
    message?: string;
    expiresHours?: number;
    requestedById?: string;
  }) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, storeId: input.storeId },
      include: { items: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const expiresAt = input.expiresHours
      ? new Date(Date.now() + Math.max(1, input.expiresHours) * 60 * 60 * 1000)
      : new Date(Date.now() + 72 * 60 * 60 * 1000);

    const approval = await prisma.proofApproval.create({
      data: {
        storeId: input.storeId,
        orderId: input.orderId,
        designId: input.designId,
        mockupId: input.mockupId,
        token: this.createToken(),
        status: 'PENDING',
        recipientEmail: input.recipientEmail,
        message: input.message,
        expiresAt,
        requestedById: input.requestedById,
      },
    });

    await prisma.proofApprovalEvent.create({
      data: {
        approvalId: approval.id,
        storeId: input.storeId,
        actorType: 'ADMIN',
        actorId: input.requestedById,
        eventType: 'REQUESTED',
        payload: {
          orderNumber: order.orderNumber,
          recipientEmail: input.recipientEmail,
        },
      },
    });

    await prisma.order.update({
      where: { id: input.orderId },
      data: { fulfillmentStatus: 'proof_pending' },
    });

    return approval;
  }

  async listForStore(storeId: string, status?: string) {
    return prisma.proofApproval.findMany({
      where: {
        storeId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        order: { select: { id: true, orderNumber: true, customerEmail: true, customerName: true } },
        events: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByToken(token: string) {
    const approval = await prisma.proofApproval.findUnique({
      where: { token },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
                productVariant: true,
                design: true,
              },
            },
          },
        },
        design: true,
        mockup: true,
      },
    });

    if (!approval) {
      return null;
    }

    if (approval.status === 'PENDING' && approval.expiresAt && approval.expiresAt.getTime() < Date.now()) {
      await prisma.proofApproval.update({
        where: { id: approval.id },
        data: { status: 'EXPIRED' },
      });
      await prisma.proofApprovalEvent.create({
        data: {
          approvalId: approval.id,
          storeId: approval.storeId,
          actorType: 'SYSTEM',
          eventType: 'EXPIRED',
        },
      });
      return {
        ...approval,
        status: 'EXPIRED',
      };
    }

    return approval;
  }

  async respondByToken(token: string, status: 'APPROVED' | 'REJECTED', comment?: string) {
    const approval = await prisma.proofApproval.findUnique({ where: { token } });
    if (!approval) throw new Error('Proof request not found');
    if (approval.status !== 'PENDING') throw new Error('Proof request already resolved');
    if (approval.expiresAt && approval.expiresAt.getTime() < Date.now()) {
      throw new Error('Proof request has expired');
    }

    const updated = await prisma.proofApproval.update({
      where: { id: approval.id },
      data: {
        status,
        respondedAt: new Date(),
        responseComment: comment,
      },
    });

    await prisma.proofApprovalEvent.create({
      data: {
        approvalId: approval.id,
        storeId: approval.storeId,
        actorType: 'CUSTOMER',
        eventType: status,
        payload: comment ? { comment } : undefined,
      },
    });

    await prisma.order.update({
      where: { id: approval.orderId },
      data: {
        fulfillmentStatus: status === 'APPROVED' ? 'proof_approved' : 'proof_rejected',
        ...(status === 'APPROVED' ? { status: 'CONFIRMED' } : {}),
      },
    });

    if (status === 'APPROVED') {
      await WebhookService.publish({
        storeId: approval.storeId,
        eventType: 'proof.approved',
        payload: { approvalId: approval.id, orderId: approval.orderId },
      });
    }

    await AuditService.log({
      actorType: 'Customer',
      action: status === 'APPROVED' ? 'proof.approved' : 'proof.rejected',
      entityType: 'ProofApproval',
      entityId: approval.id,
      meta: { orderId: approval.orderId, comment },
    });

    return updated;
  }

  async respondById(approvalId: string, status: 'APPROVED' | 'REJECTED', actorId?: string, comment?: string) {
    const approval = await prisma.proofApproval.findUnique({ where: { id: approvalId } });
    if (!approval) throw new Error('Proof request not found');
    if (approval.status !== 'PENDING') throw new Error('Proof request already resolved');

    const updated = await prisma.proofApproval.update({
      where: { id: approval.id },
      data: {
        status,
        respondedAt: new Date(),
        responseComment: comment,
      },
    });

    await prisma.proofApprovalEvent.create({
      data: {
        approvalId: approval.id,
        storeId: approval.storeId,
        actorType: 'ADMIN',
        actorId,
        eventType: status,
        payload: comment ? { comment } : undefined,
      },
    });

    await prisma.order.update({
      where: { id: approval.orderId },
      data: {
        fulfillmentStatus: status === 'APPROVED' ? 'proof_approved' : 'proof_rejected',
        ...(status === 'APPROVED' ? { status: 'CONFIRMED' } : {}),
      },
    });

    if (status === 'APPROVED') {
      await WebhookService.publish({
        storeId: approval.storeId,
        eventType: 'proof.approved',
        payload: { approvalId: approval.id, orderId: approval.orderId },
      });
    }

    await AuditService.log({
      actorType: 'Admin',
      actorUserId: actorId || null,
      action: status === 'APPROVED' ? 'proof.approved_admin' : 'proof.rejected_admin',
      entityType: 'ProofApproval',
      entityId: approval.id,
      meta: { orderId: approval.orderId, comment },
    });

    return updated;
  }
}

export default new ProofService();
