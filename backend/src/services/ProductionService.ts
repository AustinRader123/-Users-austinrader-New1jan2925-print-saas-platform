import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

export class ProductionService {
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
    return prisma.productionJob.update({
      where: { id: jobId },
      data: {
        status: status as any,
        ...(status === 'IN_PRODUCTION' && { startedAt: new Date() }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
    });
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
}

export default new ProductionService();
