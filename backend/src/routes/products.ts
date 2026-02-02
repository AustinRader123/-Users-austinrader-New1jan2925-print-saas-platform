import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProductService from '../services/ProductService.js';
import logger from '../logger.js';

const router = Router();

// Get product by ID
router.get('/:productId', async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const storeId = req.storeId || req.query.storeId as string;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const product = await ProductService.getProduct(productId, storeId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    logger.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// List products
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    let storeId = (req.query.storeId as string) || req.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    const products = await ProductService.listProducts(storeId, {
      skip: req.query.skip ? parseInt(req.query.skip as string) : 0,
      take: req.query.take ? parseInt(req.query.take as string) : 20,
      status: (req.query.status as string) || 'ACTIVE',
      category: req.query.category as string,
      search: req.query.search as string,
    });

    res.json(products);
  } catch (error) {
    logger.error('List products error:', error);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// Create product (admin only)
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, basePrice, storeId } = req.body;

    if (!name || !storeId) {
      return res.status(400).json({ error: 'Name and storeId required' });
    }

    const product = await ProductService.createProduct(storeId, {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      description,
      category,
      basePrice: basePrice || 0,
    });

    res.status(201).json(product);
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Create variant
router.post('/:productId/variants', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const { name, sku, size, color, supplierCost } = req.body;

    if (!sku) {
      return res.status(400).json({ error: 'SKU required' });
    }

    const variant = await ProductService.createVariant(productId, {
      name: name || `${size || ''} ${color || ''}`.trim(),
      sku,
      size,
      color,
      supplierCost: supplierCost || 0,
    });

    res.status(201).json(variant);
  } catch (error) {
    logger.error('Create variant error:', error);
    res.status(500).json({ error: 'Failed to create variant' });
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
