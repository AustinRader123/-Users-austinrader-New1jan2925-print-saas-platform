import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import CustomizerService from '../services/CustomizerService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const previewSchema = z.object({
  storeSlug: z.string().min(1).optional(),
  storeId: z.string().min(1).optional(),
  productId: z.string().min(1),
  variantId: z.string().min(1),
  customization: z.any(),
});

const addToCartSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  customization: z.any(),
  previewFileId: z.string().optional(),
});

router.get('/products/:productId/config', limiter, async (req, res) => {
  try {
    const storeSlug = req.query.storeSlug ? String(req.query.storeSlug) : undefined;
    const storeId = req.query.storeId ? String(req.query.storeId) : undefined;

    const data = await CustomizerService.getPublicCustomizerData({
      storeSlug,
      storeId,
      host: req.headers.host as string | undefined,
      productId: req.params.productId,
    });

    if (!data) return res.status(404).json({ error: 'Customizer profile not found' });

    return res.json({
      store: { id: data.store.id, slug: data.store.slug, name: data.store.name },
      profile: data.profile,
      categories: data.categories,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to fetch customizer config' });
  }
});

router.post('/upload', limiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const result = await CustomizerService.createUploadForPublic({
      storeSlug: req.body?.storeSlug ? String(req.body.storeSlug) : undefined,
      storeId: req.body?.storeId ? String(req.body.storeId) : undefined,
      host: req.headers.host as string | undefined,
      file: req.file,
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Upload failed' });
  }
});

router.post('/preview', limiter, async (req, res) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const result = await CustomizerService.preview({
      storeSlug: parsed.data.storeSlug,
      storeId: parsed.data.storeId,
      host: req.headers.host as string | undefined,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      customization: parsed.data.customization,
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Preview failed' });
  }
});

router.post('/cart/:token/customize-add', limiter, async (req, res) => {
  const parsed = addToCartSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  try {
    const cart = await CustomizerService.customizeAndAddToCart({
      cartToken: req.params.token,
      productId: parsed.data.productId,
      variantId: parsed.data.variantId,
      quantity: parsed.data.quantity || 1,
      customization: parsed.data.customization,
      previewFileId: parsed.data.previewFileId,
    });

    return res.status(201).json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to customize and add to cart' });
  }
});

export default router;
