import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, storeId: string) {
    return this.prisma.product.findMany({
      where: {
        tenantId,
        storeId,
        deletedAt: null,
      },
      include: {
        variants: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async create(tenantId: string, dto: CreateProductDto) {
    const store = await this.prisma.store.findFirst({
      where: {
        id: dto.storeId,
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!store) {
      throw new NotFoundException('store not found');
    }

    const slug = dto.slug.trim().toLowerCase();
    const exists = await this.prisma.product.findFirst({
      where: {
        storeId: dto.storeId,
        slug,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('product slug already exists for store');
    }

    try {
      return await this.prisma.product.create({
        data: {
          tenantId,
          storeId: dto.storeId,
          slug,
          name: dto.name.trim(),
          description: dto.description?.trim(),
          category: dto.category?.trim(),
          variants: {
            create: (dto.variants ?? []).map((variant) => ({
              tenantId,
              storeId: dto.storeId,
              sku: variant.sku.trim().toUpperCase(),
              name: variant.name.trim(),
              color: variant.color?.trim(),
              size: variant.size?.trim(),
              baseCost: variant.baseCost,
              basePrice: variant.basePrice,
            })),
          },
        },
        include: { variants: true },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('product or variant unique constraint violated');
      }
      throw error;
    }
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        isActive: dto.isActive,
      },
      include: {
        variants: {
          where: { deletedAt: null },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });
  }
}
