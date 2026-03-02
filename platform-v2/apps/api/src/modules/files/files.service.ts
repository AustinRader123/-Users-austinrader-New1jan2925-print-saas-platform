import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFileAssetDto, PresignQueryDto, UpdateFileAssetDto } from './files.dto';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  presign(tenantId: string, query: PresignQueryDto) {
    const bucket = (query.bucket || 'uploads').trim();
    const token = randomUUID();

    return {
      key: query.key,
      bucket,
      uploadUrl: `https://storage.skuflow.ai/${bucket}/${encodeURIComponent(query.key)}?token=${token}`,
      method: 'PUT',
      expiresIn: 300,
      headers: {
        'Content-Type': query.mimeType || 'application/octet-stream',
      },
      tenantId,
    };
  }

  create(tenantId: string, userId: string | undefined, body: CreateFileAssetDto) {
    return this.prisma.fileAsset.create({
      data: {
        tenantId,
        storeId: body.storeId,
        key: body.key,
        bucket: body.bucket,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        width: body.width,
        height: body.height,
        checksum: body.checksum,
        metadata: body.metadata ?? {},
        createdById: userId,
      },
    });
  }

  list(tenantId: string, storeId?: string) {
    return this.prisma.fileAsset.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getById(tenantId: string, id: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!file) {
      throw new NotFoundException('file asset not found');
    }
    return file;
  }

  async update(tenantId: string, id: string, body: UpdateFileAssetDto) {
    const existing = await this.prisma.fileAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('file asset not found');
    }

    return this.prisma.fileAsset.update({
      where: { id },
      data: {
        checksum: body.checksum,
        metadata: body.metadata,
      },
    });
  }

  async archive(tenantId: string, id: string) {
    const existing = await this.prisma.fileAsset.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('file asset not found');
    }

    return this.prisma.fileAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
