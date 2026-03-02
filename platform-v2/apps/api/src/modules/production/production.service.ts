import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductionJobDto } from './production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async board(tenantId: string, storeId: string) {
    const jobs = await this.prisma.productionJob.findMany({
      where: { tenantId, storeId, deletedAt: null },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            status: true,
            customer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take: 300,
    });

    return {
      columns: ['NEEDS_PROOF', 'READY', 'PRINTING', 'PACKING', 'SHIPPED'],
      jobs,
    };
  }

  async create(tenantId: string, storeId: string, body: CreateProductionJobDto) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: body.orderId,
        tenantId,
        storeId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('order not found');
    }

    if (!['APPROVED', 'IN_PRODUCTION', 'SHIPPED', 'CLOSED'].includes(String(order.status))) {
      throw new ConflictException('order must be approved before production');
    }

    const existing = await this.prisma.productionJob.findFirst({
      where: {
        tenantId,
        storeId,
        orderId: body.orderId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('production job already exists for order');
    }

    const created = await this.prisma.$transaction(async (tx: any) => {
      const job = await tx.productionJob.create({
        data: {
          tenantId,
          storeId,
          orderId: body.orderId,
          status: 'NEEDS_PROOF',
          priority: body.priority ?? 100,
          dueAt: body.dueAt ? new Date(body.dueAt) : null,
        },
        include: {
          order: {
            select: {
              id: true,
              number: true,
              customer: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      await tx.order.update({
        where: { id: body.orderId },
        data: { status: 'IN_PRODUCTION' },
      });

      return job;
    });

    return created;
  }

  async updateStatus(tenantId: string, storeId: string, id: string, status: string) {
    const job = await this.prisma.productionJob.findFirst({
      where: { id, tenantId, storeId, deletedAt: null },
      select: { id: true, orderId: true },
    });

    if (!job) {
      throw new NotFoundException('production job not found');
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const nextJob = await tx.productionJob.update({
        where: { id },
        data: { status: status as any },
        include: {
          order: {
            select: {
              id: true,
              number: true,
              customer: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      if (status === 'SHIPPED') {
        await tx.order.update({
          where: { id: job.orderId },
          data: { status: 'SHIPPED' },
        });
      }

      return nextJob;
    });

    return updated;
  }
}
