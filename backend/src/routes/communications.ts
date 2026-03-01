import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import EmailService from '../services/EmailService.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();
router.use(authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('comms.manage'));

const configSchema = z.object({
  provider: z.enum(['MOCK', 'SMTP', 'SENDGRID']),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional().nullable(),
  enabled: z.boolean().optional(),
  config: z.record(z.any()).optional(),
});

router.get('/email-config', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string;
    const cfg = await EmailService.getProviderConfig(tenantId);
    return res.json(cfg);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to fetch email config' });
  }
});

router.put('/email-config', async (req: AuthRequest, res: Response) => {
  const parsed = configSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  try {
    const tenantId = (req as any).tenantId as string;
    const cfg = await EmailService.upsertProviderConfig({
      tenantId,
      ...parsed.data,
    });
    return res.json(cfg);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to update email config' });
  }
});

router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = (req as any).tenantId as string;
    const storeId = (req.query.storeId as string | undefined) || req.storeId;
    const logs = await EmailService.listMessages(tenantId, storeId);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to fetch communication logs' });
  }
});

export default router;
