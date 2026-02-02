import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

export interface DesignContent {
  layers: Array<{
    id: string;
    type: 'text' | 'image' | 'shape';
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fill?: string;
    stroke?: string;
    opacity?: number;
    zIndex: number;
  }>;
  canvas: {
    width: number;
    height: number;
  };
  metadata?: Record<string, any>;
}

export class DesignService {
  async createDesign(userId: string, data: any) {
    return prisma.design.create({
      data: {
        userId,
        name: data.name || 'Untitled Design',
        description: data.description,
        content: data.content || { layers: [], canvas: { width: 800, height: 600 } },
        status: 'DRAFT',
        isPublic: false,
      },
    });
  }

  async getDesign(designId: string, userId?: string) {
    const where: any = { id: designId };
    if (userId) {
      where.OR = [{ userId }, { isPublic: true }];
    }

    return prisma.design.findFirst({
      where,
      include: {
        assets: true,
        mockups: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateDesign(designId: string, userId: string, data: any) {
    const design = await prisma.design.findUnique({ where: { id: designId } });
    if (!design || design.userId !== userId) {
      throw new Error('Design not found or unauthorized');
    }

    return prisma.design.update({
      where: { id: designId },
      data,
    });
  }

  async listUserDesigns(userId: string, options: { skip?: number; take?: number } = {}) {
    return prisma.design.findMany({
      where: { userId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
      skip: options.skip || 0,
      take: options.take || 20,
      include: {
        mockups: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async addAsset(
    designId: string,
    type: 'UPLOADED_IMAGE' | 'CLIPART' | 'TEXT' | 'VECTOR',
    url: string,
    metadata?: any
  ) {
    return prisma.designAsset.create({
      data: {
        designId,
        type,
        url,
        metadata,
      },
    });
  }

  async exportDesign(designId: string, userId: string, format: 'png' | 'svg' = 'png') {
    const design = await this.getDesign(designId, userId);
    if (!design) {
      throw new Error('Design not found');
    }

    // Export logic would be handled by mockup engine or external service
    // This placeholder marks the design as exported
    return prisma.design.update({
      where: { id: designId },
      data: { status: 'EXPORTED' },
    });
  }

  async validateDesign(designId: string, decorationAreaId: string) {
    const design = await prisma.design.findUnique({ where: { id: designId } });
    const area = await prisma.decorationArea.findUnique({
      where: { id: decorationAreaId },
    });

    if (!design || !area) {
      return { valid: false, errors: ['Design or area not found'] };
    }

    const content = design.content as unknown as DesignContent;
    const errors: string[] = [];

    // Check if design fits within decoration area
    if (content.canvas.width > area.maxWidth) {
      errors.push(`Design width exceeds max width of ${area.maxWidth}px`);
    }
    if (content.canvas.height > area.maxHeight) {
      errors.push(`Design height exceeds max height of ${area.maxHeight}px`);
    }

    // Check layer count / color count
    const uniqueColors = new Set(
      content.layers
        .filter((l) => l.fill && l.fill !== 'transparent')
        .map((l) => l.fill)
    );

    if (area.maxColorCount && uniqueColors.size > area.maxColorCount) {
      errors.push(
        `Design has too many colors (${uniqueColors.size} > ${area.maxColorCount})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  async archiveDesign(designId: string, userId: string) {
    const design = await prisma.design.findUnique({ where: { id: designId } });
    if (!design || design.userId !== userId) {
      throw new Error('Design not found or unauthorized');
    }

    return prisma.design.update({
      where: { id: designId },
      data: { status: 'ARCHIVED' },
    });
  }
}

export default new DesignService();
