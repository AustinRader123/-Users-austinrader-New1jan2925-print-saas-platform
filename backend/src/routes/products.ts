import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProductService from '../services/ProductService.js';
import ProductCatalogService from '../services/ProductCatalogService.js';
import logger from '../logger.js';
import { z } from 'zod';
import StorageProvider from '../services/StorageProvider.js';

const router = Router();
router.use(authMiddleware);

const storeScopedSchema = z.object({
  storeId: z.string().min(1),
});

const createProductSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  basePrice: z.number().nonnegative().optional(),
  slug: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  storeId: z.string().min(1),
});

const variantSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  sku: z.string().min(1),
  size: z.string().optional(),
  color: z.string().optional(),
  cost: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  inventoryQty: z.number().int().nonnegative().optional(),
  externalId: z.string().optional(),
});

const imageSchema = z.object({
  storeId: z.string().min(1),
  url: z.string().min(1).optional(),
  path: z.string().optional(),
  fileName: z.string().optional(),
  fileContentBase64: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  altText: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
});

const updateImageSchema = imageSchema.partial().extend({
  storeId: z.string().min(1),
});

function resolveStoreId(req: AuthRequest): string | null {
  return (req.storeId as string) || (req.query.storeId as string) || (req.body?.storeId as string) || null;
}

function parseOr400<T>(schema: z.ZodType<T>, payload: unknown, res: Response): T | null {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

// Get product by ID
router.get('/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const storeId = resolveStoreId(req);

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const product = await ProductCatalogService.getProduct(storeId, productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      description: product.description,
      tags: product.tags,
      active: product.active,
      status: product.status,
      variants: product.variants,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// List products
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const products = await ProductCatalogService.listProducts(storeId, req.query.search as string | undefined);

    res.json(products.map((product) => ({
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      description: product.description,
      tags: product.tags,
      active: product.active,
      status: product.status,
      variants: product.variants,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    })));
  } catch (error) {
    logger.error('List products error:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Create product (admin only)
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(createProductSchema, req.body, res);
    if (!body) return;
    const { name, description, category, basePrice, slug, status, tags, active, storeId } = body;

    const safeSlug = String(slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const product = await ProductCatalogService.createProduct(storeId, {
      name,
      slug: safeSlug,
      description,
      category,
      tags,
      active,
      basePrice: basePrice || 0,
      status,
    });

    res.status(201).json(product);
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:productId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const body = parseOr400(updateProductSchema, req.body, res);
    if (!body) return;
    const product = await ProductCatalogService.updateProduct(body.storeId, productId, body);
    res.json(product);
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update product' });
  }
});

// Delete product
router.delete('/:productId', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const body = parseOr400(storeScopedSchema, req.body || req.query, res);
    if (!body) return;

    const result = await ProductCatalogService.deleteProduct(body.storeId, productId);
    res.json(result);
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete product' });
  }
});

// List variants
router.get('/:productId/variants', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;
    const variants = await ProductCatalogService.listVariants(body.storeId, req.params.productId);
    res.json(variants);
  } catch (error) {
    logger.error('List variants error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list variants' });
  }
});

// Create variant
router.post('/:productId/variants', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const body = parseOr400(variantSchema, req.body, res);
    if (!body) return;
    const { name, sku, size, color, cost, price, inventoryQty, externalId, storeId } = body;

    const variant = await ProductCatalogService.createVariant(storeId, productId, {
      name: name || `${size || ''} ${color || ''}`.trim(),
      sku,
      size,
      color,
      cost: cost || 0,
      price: price || 0,
      inventoryQty: inventoryQty || 0,
      externalId,
    });

    res.status(201).json(variant);
  } catch (error) {
    logger.error('Create variant error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
  }
});

// Update variant
router.put('/:productId/variants/:variantId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(variantSchema.partial().extend({ storeId: z.string().min(1) }), req.body, res);
    if (!body) return;
    const variant = await ProductCatalogService.updateVariant(body.storeId, req.params.productId, req.params.variantId, body);
    res.json(variant);
  } catch (error) {
    logger.error('Update variant error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update variant' });
  }
});

// Delete variant
router.delete('/:productId/variants/:variantId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, req.body || req.query, res);
    if (!body) return;
    const result = await ProductCatalogService.deleteVariant(body.storeId, req.params.productId, req.params.variantId);
    res.json(result);
  } catch (error) {
    logger.error('Delete variant error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete variant' });
  }
});

// List images
router.get('/:productId/images', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;
    const images = await ProductCatalogService.listImages(body.storeId, req.params.productId);
    res.json(images);
  } catch (error) {
    logger.error('List images error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list images' });
  }
});

// Add image
router.post('/:productId/images', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(imageSchema, req.body, res);
    if (!body) return;
    const { storeId, color, sortOrder, altText, position } = body;

    let url = body.url;
    let path = body.path;
    if (body.fileContentBase64 && body.fileName) {
      const upload = await StorageProvider.uploadFile(
        Buffer.from(body.fileContentBase64, 'base64'),
        body.fileName,
        `products/${req.params.productId}`,
      );
      url = upload.url;
      path = upload.path;
    }
    if (!url) {
      return res.status(400).json({ error: 'url or fileContentBase64+fileName required' });
    }

    const image = await ProductCatalogService.createImage(storeId, req.params.productId, {
      url,
      path,
      color,
      sortOrder,
      altText,
      position,
    });
    res.status(201).json(image);
  } catch (error) {
    logger.error('Create image error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create image' });
  }
});

// Delete image
router.delete('/:productId/images/:imageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, req.body || req.query, res);
    if (!body) return;
    const result = await ProductCatalogService.deleteImage(body.storeId, req.params.productId, req.params.imageId);
    res.json(result);
  } catch (error) {
    logger.error('Delete image error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete image' });
  }
});

router.put('/:productId/images/:imageId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(updateImageSchema, req.body, res);
    if (!body) return;
    const image = await ProductCatalogService.updateImage(body.storeId, req.params.productId, req.params.imageId, body);
    res.json(image);
  } catch (error) {
    logger.error('Update image error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update image' });
  }
});

// Add decoration area
router.post('/:productId/decoration-areas', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { name, printMethod, maxWidth, maxHeight, costPerSquareIn } = req.body;

    if (!name || !printMethod) {
      return res.status(400).json({ error: 'Name and printMethod required' });
    }

    const area = await ProductService.addDecorationArea(productId, {
      name,
      printMethod,
      maxWidth: maxWidth || 800,
      maxHeight: maxHeight || 600,
      offsetX: 0,
      offsetY: 0,
      costPerSquareIn: costPerSquareIn || 0,
    });

    res.status(201).json(area);
  } catch (error) {
    logger.error('Add decoration area error:', error);
    res.status(500).json({ error: 'Failed to add decoration area' });
  }
});

export default router;
