import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '../middleware/permissions.js';

const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requirePermission('documents.view'));

const templateSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  active: z.boolean().optional(),
  template: z.record(z.any()),
});

const listSchema = z.object({
  type: z.enum(['QUOTE', 'INVOICE', 'PROOF', 'WORK_ORDER']).optional(),
  storeId: z.string().min(1).optional(),
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = listSchema.safeParse(req.query || {});
    if (!parsed.success) return res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() });

    const storeId = parsed.data.storeId || req.storeId;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });

    const docs = await (prisma as any).generatedDocument.findMany({
      where: {
        storeId,
        ...(parsed.data.type ? { type: parsed.data.type } : {}),
      },
      include: {
        file: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return res.json(docs);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to list documents' });
  }
});

router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.query.storeId as string) || req.storeId;
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const templates = await (prisma as any).documentTemplate.findMany({
      where: { storeId },
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json(templates);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to list templates' });
  }
});

router.put('/templates/:type', async (req: AuthRequest, res: Response) => {
  if (!['ADMIN', 'STORE_OWNER'].includes(req.userRole || '')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const type = String(req.params.type || '').toUpperCase();
  if (!['QUOTE', 'INVOICE', 'PROOF', 'WORK_ORDER'].includes(type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  try {
    const template = await (prisma as any).documentTemplate.upsert({
      where: {
        storeId_type_name: {
          storeId: parsed.data.storeId,
          type,
          name: parsed.data.name,
        },
      },
      create: {
        storeId: parsed.data.storeId,
        type,
        name: parsed.data.name,
        active: parsed.data.active ?? true,
        template: parsed.data.template,
      },
      update: {
        active: parsed.data.active ?? true,
        template: parsed.data.template,
      },
    });
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message || 'Failed to upsert template' });
  }
});

export default router;
