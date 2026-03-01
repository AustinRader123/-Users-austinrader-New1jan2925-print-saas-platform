import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import CustomizerService from '../services/CustomizerService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(requirePermission('catalog.manage'));
router.use(requirePermission('customizer.manage'));
router.use(requireFeature('customizer.enabled'));

const storeIdSchema = z.object({ storeId: z.string().min(1) });

const profileSchema = z.object({
  storeId: z.string().min(1),
  enabled: z.boolean().optional(),
  locations: z.array(z.any()).min(1),
  rules: z.any().optional(),
});

const personalizationSchema = z.object({
  storeId: z.string().min(1),
  schemas: z.array(z.object({
    id: z.string().optional(),
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().nonnegative().optional(),
    options: z.any().optional(),
    pricing: z.any().optional(),
    validation: z.any().optional(),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  })),
});

const categorySchema = z.object({
  storeId: z.string().min(1),
  profileId: z.string().optional(),
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

function parseOr400<T>(schema: z.ZodType<T>, payload: unknown) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  return { ok: true as const, data: parsed.data };
}

function resolveStoreId(req: AuthRequest) {
  return String(req.body?.storeId || req.query.storeId || req.storeId || '');
}

router.get('/products/:productId', async (req: AuthRequest, res) => {
  const storeId = resolveStoreId(req);
  const parsed = parseOr400(storeIdSchema, { storeId });
  if (!parsed.ok) return res.status(400).json({ error: 'Invalid payload', details: parsed.error });

  const data = await CustomizerService.getAdminBuilderData(parsed.data.storeId, req.params.productId);
  return res.json(data || null);
});

router.put('/products/:productId/profile', async (req: AuthRequest, res) => {
  const parsed = parseOr400(profileSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'Invalid payload', details: parsed.error });

  const profile = await CustomizerService.upsertProfile({
    storeId: parsed.data.storeId,
    productId: req.params.productId,
    enabled: parsed.data.enabled,
    locations: parsed.data.locations,
    rules: parsed.data.rules,
  });

  return res.json(profile);
});

router.put('/products/:productId/personalization-schemas', async (req: AuthRequest, res) => {
  const parsed = parseOr400(personalizationSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'Invalid payload', details: parsed.error });

  const schemas = await CustomizerService.upsertPersonalizationSchemas({
    storeId: parsed.data.storeId,
    productId: req.params.productId,
    schemas: parsed.data.schemas,
  });

  return res.json(schemas);
});

router.get('/artwork-categories', async (req: AuthRequest, res) => {
  const storeId = resolveStoreId(req);
  const parsed = parseOr400(storeIdSchema, { storeId });
  if (!parsed.ok) return res.status(400).json({ error: 'Invalid payload', details: parsed.error });

  const profileId = req.query.profileId ? String(req.query.profileId) : undefined;
  const categories = await CustomizerService.listArtworkCategories(parsed.data.storeId, profileId);
  return res.json(categories);
});

router.post('/artwork-categories', async (req: AuthRequest, res) => {
  const parsed = parseOr400(categorySchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: 'Invalid payload', details: parsed.error });

  const category = await CustomizerService.upsertArtworkCategory(parsed.data);
  return res.status(201).json(category);
});

router.post('/artwork-assets/upload', upload.single('file'), async (req: AuthRequest, res) => {
  const storeId = String(req.body?.storeId || req.storeId || '');
  if (!storeId) return res.status(400).json({ error: 'storeId required' });
  if (!req.file) return res.status(400).json({ error: 'file required' });

  const tags = String(req.body?.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const asset = await CustomizerService.uploadArtworkAsset({
    storeId,
    categoryId: req.body?.categoryId ? String(req.body.categoryId) : undefined,
    file: req.file,
    name: req.body?.name ? String(req.body.name) : undefined,
    tags,
    createdById: req.userId,
  });

  return res.status(201).json(asset);
});

export default router;
