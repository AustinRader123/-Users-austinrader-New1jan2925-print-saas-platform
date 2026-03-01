import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import OnboardingService from '../services/OnboardingService.js';
import { requirePermission } from '../middleware/permissions.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
router.use(authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('onboarding.manage'));

const updateSchema = z.object({
  storeId: z.string().min(1).optional(),
  step: z.number().int().min(1).max(7).optional(),
  data: z.record(z.any()).optional(),
  completed: z.boolean().optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string;
    const storeId = (req.query.storeId as string | undefined) || req.storeId;
    const state = await OnboardingService.getState(tenantId, storeId);
    return res.json(state);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to fetch onboarding state' });
  }
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  try {
    const tenantId = (req as any).tenantId as string;
    const state = await OnboardingService.upsertState({
      tenantId,
      storeId: parsed.data.storeId || req.storeId,
      step: parsed.data.step,
      data: parsed.data.data,
      completed: parsed.data.completed,
    });
    return res.json(state);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to update onboarding state' });
  }
});

router.post('/complete', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string;
    const storeId = (req.body?.storeId as string | undefined) || req.storeId;
    const state = await OnboardingService.complete(tenantId, storeId);
    return res.json(state);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to complete onboarding' });
  }
});

router.get('/next-steps', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string;
    const storeId = (req.query.storeId as string | undefined) || req.storeId || null;

    const [onboarding, draftTheme, publishedTheme, emailConfig] = await Promise.all([
      OnboardingService.getState(tenantId, storeId || undefined),
      (prisma as any).themeConfig.findFirst({ where: { storeId: storeId || undefined, publishedAt: null }, orderBy: { updatedAt: 'desc' } }),
      (prisma as any).themeConfig.findFirst({ where: { storeId: storeId || undefined, NOT: { publishedAt: null } }, orderBy: { publishedAt: 'desc' } }),
      (prisma as any).emailProviderConfig.findUnique({ where: { tenantId } }),
    ]);

    return res.json({
      onboardingIncomplete: !Boolean(onboarding?.completed),
      themeUnpublished: Boolean(draftTheme) || !Boolean(publishedTheme),
      emailProviderDisabled: emailConfig ? !Boolean(emailConfig.enabled) : true,
      onboardingStep: onboarding?.step || 1,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to get next steps' });
  }
});

export default router;
