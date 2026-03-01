import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ThemeService from '../services/ThemeService.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();
router.use(authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('storefront.theme.manage'));

const updateSchema = z.object({
  storeId: z.string().min(1),
  storefrontId: z.string().optional(),
  config: z.any(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.query.storeId as string) || req.storeId;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const data = await ThemeService.getTheme(storeId);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to fetch theme' });
  }
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  try {
    const draft = await ThemeService.upsertDraft(parsed.data.storeId, parsed.data.config, parsed.data.storefrontId);
    return res.json(draft);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to save theme draft' });
  }
});

router.post('/publish', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.body?.storeId as string) || req.storeId;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const published = await ThemeService.publish(storeId);
    return res.json(published);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to publish theme' });
  }
});

router.post('/preview-token', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.body?.storeId as string) || req.storeId;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const token = ThemeService.createPreviewToken({
      storeId,
      userId: req.userId || 'unknown',
      expiresMinutes: Number(req.body?.expiresMinutes || 15),
    });
    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create preview token' });
  }
});

router.get('/preview', async (req: AuthRequest, res: Response) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'token is required' });
    const draft = await ThemeService.getDraftForPreviewToken(token);
    return res.json(draft);
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message || 'Invalid preview token' });
  }
});

export default router;
