import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto } from './stores.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.store.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        domain: true,
        isActive: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async create(tenantId: string, dto: CreateStoreDto) {
    const slug = dto.slug.trim().toLowerCase();
    const domain = dto.domain?.trim().toLowerCase();

    const exists = await this.prisma.store.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug,
        },
      },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('store slug already exists');
    }

    return this.prisma.store.create({
      data: {
        tenantId,
        slug,
        name: dto.name.trim(),
        domain,
      },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        domain: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateStoreDto) {
    const existing = await this.prisma.store.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('store not found');
    }

    try {
      return await this.prisma.store.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          domain: dto.domain?.trim().toLowerCase(),
          isActive: dto.isActive,
        },
        select: {
          id: true,
          tenantId: true,
          slug: true,
          name: true,
          domain: true,
          isActive: true,
          updatedAt: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('store domain already in use');
      }
      throw error;
    }
  }
}
