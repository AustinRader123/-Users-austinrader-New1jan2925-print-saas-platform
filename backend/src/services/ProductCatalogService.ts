import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ProductInput = {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  tags?: unknown;
  active?: boolean;
  basePrice?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
};

type VariantInput = {
  name: string;
  sku: string;
  size?: string;
  color?: string;
  cost?: number;
  price?: number;
  inventoryQty?: number;
  externalId?: string;
};

type ImageInput = {
  url: string;
  path?: string;
  color?: string;
  sortOrder?: number;
  altText?: string;
  position?: number;
};

export class ProductCatalogService {
  async listProducts(storeId: string, search?: string) {
    return prisma.product.findMany({
      where: {
        storeId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(storeId: string, productId: string) {
    return prisma.product.findFirst({
      where: { id: productId, storeId },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images: { orderBy: { position: 'asc' } },
      },
    });
  }

  async createProduct(storeId: string, input: ProductInput) {
    return prisma.product.create({
      data: {
        storeId,
        externalId: null,
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
        tags: Array.isArray(input.tags) ? (input.tags as string[]) : [],
        active: input.active ?? true,
        basePrice: input.basePrice ?? 0,
        status: input.status ?? 'DRAFT',
        type: 'CUSTOM',
      },
      include: { variants: true, images: true },
    });
  }

  async updateProduct(storeId: string, productId: string, input: Partial<ProductInput>) {
    await this.assertProductOwnership(storeId, productId);
    return prisma.product.update({
      where: { id: productId },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.slug != null ? { slug: input.slug } : {}),
        ...(input.description != null ? { description: input.description } : {}),
        ...(input.category != null ? { category: input.category } : {}),
        ...(input.tags != null ? { tags: Array.isArray(input.tags) ? (input.tags as string[]) : [] } : {}),
        ...(input.active != null ? { active: input.active } : {}),
        ...(input.basePrice != null ? { basePrice: input.basePrice } : {}),
        ...(input.status != null ? { status: input.status } : {}),
      },
      include: { variants: true, images: true },
    });
  }

  async deleteProduct(storeId: string, productId: string) {
    await this.assertProductOwnership(storeId, productId);
    await prisma.product.delete({ where: { id: productId } });
    return { ok: true };
  }

  async listVariants(storeId: string, productId: string) {
    await this.assertProductOwnership(storeId, productId);
    return prisma.productVariant.findMany({ where: { productId }, orderBy: { createdAt: 'asc' } });
  }

  async createVariant(storeId: string, productId: string, input: VariantInput) {
    await this.assertProductOwnership(storeId, productId);
    return prisma.productVariant.create({
      data: {
        productId,
        storeId,
        name: input.name,
        sku: input.sku,
        size: input.size,
        color: input.color,
        cost: input.cost ?? 0,
        price: input.price ?? 0,
        inventoryQty: input.inventoryQty ?? 0,
        supplierCost: input.cost ?? 0,
        inventoryCount: input.inventoryQty ?? 0,
        externalId: input.externalId,
      },
    });
  }

  async updateVariant(storeId: string, productId: string, variantId: string, input: Partial<VariantInput>) {
    await this.assertProductOwnership(storeId, productId);
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId, storeId } });
    if (!variant) throw new Error('Variant not found');

    return prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.sku != null ? { sku: input.sku } : {}),
        ...(input.size != null ? { size: input.size } : {}),
        ...(input.color != null ? { color: input.color } : {}),
        ...(input.cost != null ? { cost: input.cost, supplierCost: input.cost } : {}),
        ...(input.price != null ? { price: input.price } : {}),
        ...(input.inventoryQty != null ? { inventoryQty: input.inventoryQty, inventoryCount: input.inventoryQty } : {}),
        ...(input.externalId != null ? { externalId: input.externalId } : {}),
      },
    });
  }

  async deleteVariant(storeId: string, productId: string, variantId: string) {
    await this.assertProductOwnership(storeId, productId);
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId, storeId } });
    if (!variant) throw new Error('Variant not found');
    await prisma.productVariant.delete({ where: { id: variantId } });
    return { ok: true };
  }

  async updateVariantById(storeId: string, variantId: string, input: Partial<VariantInput>) {
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, storeId } });
    if (!variant) throw new Error('Variant not found');

    return prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(input.name != null ? { name: input.name } : {}),
        ...(input.sku != null ? { sku: input.sku } : {}),
        ...(input.size != null ? { size: input.size } : {}),
        ...(input.color != null ? { color: input.color } : {}),
        ...(input.cost != null ? { cost: input.cost, supplierCost: input.cost } : {}),
        ...(input.price != null ? { price: input.price } : {}),
        ...(input.inventoryQty != null ? { inventoryQty: input.inventoryQty, inventoryCount: input.inventoryQty } : {}),
        ...(input.externalId != null ? { externalId: input.externalId } : {}),
      },
    });
  }

  async deleteVariantById(storeId: string, variantId: string) {
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, storeId } });
    if (!variant) throw new Error('Variant not found');
    await prisma.productVariant.delete({ where: { id: variantId } });
    return { ok: true };
  }

  async listImages(storeId: string, productId: string) {
    await this.assertProductOwnership(storeId, productId);
    return prisma.productImage.findMany({
      where: { productId, storeId },
      orderBy: { position: 'asc' },
    });
  }

  async createImage(storeId: string, productId: string, input: ImageInput) {
    await this.assertProductOwnership(storeId, productId);
    const latest = await prisma.productImage.findFirst({
      where: { productId, storeId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return prisma.productImage.create({
      data: {
        productId,
        storeId,
        url: input.url,
        path: input.path ?? input.url,
        color: input.color,
        sortOrder: input.sortOrder ?? input.position ?? (latest?.position ?? 0) + 1,
        altText: input.altText,
        position: input.position ?? (latest?.position ?? 0) + 1,
      },
    });
  }

  async deleteImage(storeId: string, productId: string, imageId: string) {
    await this.assertProductOwnership(storeId, productId);
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId, storeId } });
    if (!image) throw new Error('Image not found');
    await prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true };
  }

  async deleteImageById(storeId: string, imageId: string) {
    const image = await prisma.productImage.findFirst({ where: { id: imageId, storeId } });
    if (!image) throw new Error('Image not found');
    await prisma.productImage.delete({ where: { id: imageId } });
    return { ok: true };
  }

  async updateImage(storeId: string, productId: string, imageId: string, input: Partial<ImageInput>) {
    await this.assertProductOwnership(storeId, productId);
    const image = await prisma.productImage.findFirst({ where: { id: imageId, productId, storeId } });
    if (!image) throw new Error('Image not found');

    return prisma.productImage.update({
      where: { id: imageId },
      data: {
        ...(input.url != null ? { url: input.url } : {}),
        ...(input.path != null ? { path: input.path } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.sortOrder != null ? { sortOrder: input.sortOrder, position: input.sortOrder } : {}),
        ...(input.altText !== undefined ? { altText: input.altText } : {}),
      },
    });
  }

  private async assertProductOwnership(storeId: string, productId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) {
      throw new Error('Product not found for store');
    }
  }
}

export default new ProductCatalogService();
