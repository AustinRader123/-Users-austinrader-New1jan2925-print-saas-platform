import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

export class ProductService {
  async resolveStoreId(storeIdOrSlug: string): Promise<string> {
    // If it looks like a UUID (has hyphens), return as-is
    if (storeIdOrSlug.includes('-')) {
      return storeIdOrSlug;
    }
    // Otherwise, resolve slug to ID
    const store = await prisma.store.findFirst({
      where: { slug: storeIdOrSlug },
    });
    return store?.id || storeIdOrSlug; // Fallback to original in case not found
  }

  async getProduct(productId: string, storeId: string) {
    const resolvedStoreId = await this.resolveStoreId(storeId);
    return prisma.product.findFirst({
      where: { id: productId, storeId: resolvedStoreId },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        decorationAreas: true,
        pricingRules: { where: { active: true } },
      },
    });
  }

  async listProducts(
    storeId: string,
    options: {
      skip?: number;
      take?: number;
      status?: string;
      category?: string;
      search?: string;
    } = {}
  ) {
    const resolvedStoreId = await this.resolveStoreId(storeId);
    const where: any = { storeId: resolvedStoreId, status: options.status || 'ACTIVE' };

    if (options.category) where.category = options.category;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return prisma.product.findMany({
      where,
      include: {
        variants: true,
        images: { take: 1, orderBy: { position: 'asc' } },
      },
      skip: options.skip || 0,
      take: options.take || 20,
    });
  }

  async createProduct(storeId: string, data: any) {
    return prisma.product.create({
      data: {
        ...data,
        storeId,
        status: 'DRAFT',
      },
      include: {
        variants: true,
        images: true,
        decorationAreas: true,
      },
    });
  }

  async updateProduct(productId: string, storeId: string, data: any) {
    return prisma.product.update({
      where: { id: productId },
      data,
      include: {
        variants: true,
        images: true,
        decorationAreas: true,
      },
    });
  }

  async createVariant(productId: string, data: any) {
    return prisma.productVariant.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  async addProductImage(productId: string, url: string, altText?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const maxPosition = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return prisma.productImage.create({
      data: {
        productId,
        url,
        altText,
        position: (maxPosition?.position || 0) + 1,
      },
    });
  }

  async addDecorationArea(productId: string, data: any) {
    return prisma.decorationArea.create({
      data: {
        ...data,
        productId,
      },
    });
  }
}

export default new ProductService();
