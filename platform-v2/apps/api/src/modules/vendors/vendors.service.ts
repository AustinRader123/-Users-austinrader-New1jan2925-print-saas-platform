import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVendorDto, ReceiveInventoryDto } from './vendors.dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.vendor.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        name: true,
        provider: true,
        externalId: true,
        isActive: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  create(tenantId: string, body: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: {
        tenantId,
        storeId: body.storeId,
        name: body.name.trim(),
        provider: (body.provider || 'MOCK') as any,
        externalId: body.externalId?.trim(),
      },
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        name: true,
        provider: true,
        externalId: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async receiveInventory(tenantId: string, vendorId: string, body: ReceiveInventoryDto) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!vendor) {
      throw new NotFoundException('vendor not found');
    }

    const variantIds = body.lines.map((line) => line.variantId);
    const variants = await this.prisma.variant.findMany({
      where: {
        id: { in: variantIds },
        tenantId,
        storeId: body.storeId,
        deletedAt: null,
      },
      select: { id: true, sku: true },
    });

    if (variants.length !== variantIds.length) {
      throw new NotFoundException('one or more variants not found for store');
    }

    const variantSet = new Set(variants.map((variant: any) => variant.id));
    const location = body.location || 'main';
    const note = body.note || `Vendor receipt: ${vendor.name}`;

    const rows = await this.prisma.$transaction(
      body.lines.map((line) =>
        this.prisma.inventory.create({
          data: {
            tenantId,
            storeId: body.storeId,
            variantId: line.variantId,
            location,
            type: 'RECEIVE',
            quantity: line.quantity,
            note,
          },
          select: {
            id: true,
            variantId: true,
            quantity: true,
            location: true,
            type: true,
            createdAt: true,
          },
        })
      )
    );

    const totals = await this.prisma.inventory.groupBy({
      by: ['variantId'],
      where: {
        tenantId,
        storeId: body.storeId,
        variantId: { in: Array.from(variantSet) },
      },
      _sum: {
        quantity: true,
      },
    });

    return {
      vendorId,
      storeId: body.storeId,
      receivedCount: rows.length,
      entries: rows,
      stock: totals.map((item: any) => ({ variantId: item.variantId, quantity: item._sum.quantity ?? 0 })),
    };
  }

  async stock(tenantId: string, storeId: string) {
    const totals = await this.prisma.inventory.groupBy({
      by: ['variantId'],
      where: { tenantId, storeId },
      _sum: { quantity: true },
      _max: { updatedAt: true },
    });

    const variants = await this.prisma.variant.findMany({
      where: {
        id: { in: totals.map((item: any) => item.variantId) },
      },
      select: { id: true, sku: true, name: true, color: true, size: true },
    });
    const variantMap = new Map<string, any>(variants.map((variant: any) => [variant.id, variant]));

    return totals
      .map((row: any) => ({
        variantId: row.variantId,
        sku: variantMap.get(row.variantId)?.sku || null,
        name: variantMap.get(row.variantId)?.name || null,
        color: variantMap.get(row.variantId)?.color || null,
        size: variantMap.get(row.variantId)?.size || null,
        quantity: row._sum.quantity ?? 0,
        updatedAt: row._max.updatedAt,
      }))
      .sort((a: any, b: any) => (a.quantity < b.quantity ? 1 : -1));
  }
}
