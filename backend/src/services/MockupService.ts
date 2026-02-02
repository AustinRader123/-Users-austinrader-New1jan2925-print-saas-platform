import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import logger from '../logger.js';
import StorageProvider from './StorageProvider.js';
import QueueManager from './QueueManager.js';

const prisma = new PrismaClient();

export interface MockupRenderJob {
  designId: string;
  productVariantId: string;
  mockupId: string;
  templateId?: string;
}

export class MockupService {
  constructor() {
    this.setupQueueProcessor();
  }

  private setupQueueProcessor() {
    QueueManager.processQueue<MockupRenderJob>('mockup-render', async (job) => {
      try {
        const { mockupId, designId, productVariantId, templateId } = job.data;

        logger.info(`Processing mockup render job: ${mockupId}`);

        // Get design and variant
        const design = await prisma.design.findUnique({
          where: { id: designId },
          include: { assets: true },
        });

        const variant = await prisma.productVariant.findUnique({
          where: { id: productVariantId },
          include: { product: true },
        });

        if (!design || !variant) {
          throw new Error('Design or variant not found');
        }

        // Get template
        const template = templateId
          ? await prisma.mockupTemplate.findUnique({ where: { id: templateId } })
          : await prisma.mockupTemplate.findUnique({
              where: { productId: variant.productId },
            });

        if (!template) {
          throw new Error('Mockup template not found');
        }

        // Generate mockup
        const imageUrl = await this.renderMockup(design, template);

        // Update mockup record
        await prisma.mockup.update({
          where: { id: mockupId },
          data: {
            imageUrl,
            thumbnailUrl: imageUrl,
            status: 'COMPLETED',
            generatedAt: new Date(),
          },
        });

        logger.info(`Mockup ${mockupId} rendered successfully: ${imageUrl}`);
        return { mockupId, imageUrl, status: 'COMPLETED' };
      } catch (error) {
        logger.error(`Mockup render failed:`, error);
        await prisma.mockup.update({
          where: { id: job.data.mockupId },
          data: {
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
          },
        });
        throw error;
      }
    });
  }

  private async renderMockup(design: any, template: any): Promise<string> {
    // Simple mockup rendering: overlay design on template
    // In production, this would include perspective warping, masking, etc.

    const templateBuffer = await StorageProvider.downloadFile(template.baseImageUrl);
    const baseImage = sharp(templateBuffer);
    const baseMetadata = await baseImage.metadata();

    // For now, create a simple overlay mockup
    // This is a placeholder - in production you'd do complex transforms
    const mockupBuffer = await baseImage
      .composite([
        {
          input: Buffer.from(`<svg width="${baseMetadata.width}" height="${baseMetadata.height}">
            <rect width="${baseMetadata.width}" height="${baseMetadata.height}" fill="rgba(200,200,200,0.1)" stroke="rgba(100,100,100,0.3)" stroke-width="2"/>
            <text x="10" y="30" font-size="16" fill="black">Design: ${design.name}</text>
            <text x="10" y="60" font-size="12" fill="gray">Product: ${design.productId || 'N/A'}</text>
          </svg>`),
          gravity: 'center',
        },
      ])
      .png()
      .toBuffer();

    // Upload to storage
    const file = await StorageProvider.uploadFile(
      mockupBuffer,
      `mockup_${design.id}.png`,
      'mockups'
    );

    return file.url;
  }

  async generateMockup(designId: string, productVariantId: string): Promise<any> {
    // Check if mockup already exists and is not expired
    const existing = await prisma.mockup.findFirst({
      where: {
        designId,
        productVariantId,
        status: 'COMPLETED',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      logger.info(`Using cached mockup: ${existing.id}`);
      return existing;
    }

    // Create mockup record with PENDING status
    const mockup = await prisma.mockup.create({
      data: {
        designId,
        productVariantId,
        imageUrl: '', // Will be filled by worker
        status: 'PROCESSING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Queue mockup generation job
    const jobData: MockupRenderJob = {
      designId,
      productVariantId,
      mockupId: mockup.id,
    };

    await QueueManager.enqueueJob('mockup-render', jobData, { priority: 5 });

    return mockup;
  }

  async updateMockupImage(mockupId: string, imageUrl: string, thumbnailUrl?: string) {
    return prisma.mockup.update({
      where: { id: mockupId },
      data: {
        imageUrl,
        thumbnailUrl: thumbnailUrl || imageUrl,
        status: 'COMPLETED',
        generatedAt: new Date(),
      },
    });
  }

  async failMockup(mockupId: string, error: string) {
    return prisma.mockup.update({
      where: { id: mockupId },
      data: {
        status: 'FAILED',
        error,
      },
    });
  }

  async getMockup(mockupId: string) {
    return prisma.mockup.findUnique({
      where: { id: mockupId },
      include: {
        design: true,
        productVariant: { include: { product: true } },
      },
    });
  }

  async getMockupsForDesign(designId: string) {
    return prisma.mockup.findMany({
      where: { designId, status: 'COMPLETED' },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async uploadTemplateImage(productId: string, buffer: Buffer): Promise<string> {
    const file = await StorageProvider.uploadFile(
      buffer,
      `template_${productId}.png`,
      'templates'
    );
    return file.url;
  }

  private isExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }

  async cleanupExpiredMockups() {
    const result = await prisma.mockup.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { not: 'EXPIRED' },
      },
      data: { status: 'EXPIRED' },
    });

    logger.info(`Marked ${result.count} mockups as expired`);
    return result;
  }

  async uploadMockupTemplate(productId: string, baseImageUrl: string, maskUrl?: string) {
    return prisma.mockupTemplate.upsert({
      where: { productId },
      update: { baseImageUrl, maskUrl },
      create: { productId, baseImageUrl, maskUrl },
    });
  }

  async getMockupTemplate(productId: string) {
    return prisma.mockupTemplate.findUnique({
      where: { productId },
    });
  }
}

export default new MockupService();
