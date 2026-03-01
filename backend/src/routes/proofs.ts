import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import ProofService from '../services/ProofService.js';
import DocumentService from '../services/DocumentService.js';
import EmailService from '../services/EmailService.js';
import logger from '../logger.js';

const router = Router();

const createSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().min(1),
  designId: z.string().optional(),
  mockupId: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  message: z.string().max(4000).optional(),
  expiresHours: z.number().int().positive().max(24 * 30).optional(),
});

const responseSchema = z.object({
  comment: z.string().max(4000).optional(),
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/public/:token', publicLimiter, async (req, res: Response) => {
  try {
    const approval = await ProofService.getByToken(req.params.token);
    if (!approval) return res.status(404).json({ error: 'Proof request not found' });
    return res.json(approval);
  } catch (error) {
    logger.error('Public proof fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch proof request' });
  }
});

router.post('/public/:token/approve', publicLimiter, async (req, res: Response) => {
  try {
    const parsed = responseSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    const approval = await ProofService.respondByToken(req.params.token, 'APPROVED', parsed.data.comment);
    return res.json(approval);
  } catch (error) {
    logger.error('Public proof approve error:', error);
    return res.status(400).json({ error: (error as Error).message || 'Failed to approve proof' });
  }
});

router.post('/public/:token/reject', publicLimiter, async (req, res: Response) => {
  try {
    const parsed = responseSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    const approval = await ProofService.respondByToken(req.params.token, 'REJECTED', parsed.data.comment);
    return res.json(approval);
  } catch (error) {
    logger.error('Public proof reject error:', error);
    return res.status(400).json({ error: (error as Error).message || 'Failed to reject proof' });
  }
});

router.use(authMiddleware);

router.get('/', roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = (req.query.storeId as string) || req.storeId || '';
    if (!storeId) return res.status(400).json({ error: 'Store ID required' });
    const approvals = await ProofService.listForStore(storeId, req.query.status as string | undefined);
    return res.json(approvals);
  } catch (error) {
    logger.error('List proofs error:', error);
    return res.status(500).json({ error: 'Failed to list proof requests' });
  }
});

router.post('/request', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const approval = await ProofService.createRequest({
      ...parsed.data,
      requestedById: req.userId,
    });

    if (approval.recipientEmail) {
      const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
      const proto = String(req.headers['x-forwarded-proto'] || 'https');
      const publicUrl = `${proto}://${host}/proof/${approval.token}`;
      const tenantId = (req as any).tenantId as string;
      await EmailService.queueAndSend({
        tenantId,
        storeId: approval.storeId,
        type: 'PROOF_REQUEST',
        toEmail: approval.recipientEmail,
        subject: 'Proof approval requested',
        bodyText: `Please review and approve your proof: ${publicUrl}`,
        meta: { approvalId: approval.id, publicUrl },
      });
    }

    return res.status(201).json({
      ...approval,
      publicUrl: `/proof/${approval.token}`,
    });
  } catch (error) {
    logger.error('Create proof request error:', error);
    return res.status(400).json({ error: (error as Error).message || 'Failed to create proof request' });
  }
});

router.post('/:approvalId/respond', roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const status = req.body?.status as 'APPROVED' | 'REJECTED';
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
    }
    const comment = req.body?.comment as string | undefined;
    const approval = await ProofService.respondById(req.params.approvalId, status, req.userId, comment);
    return res.json(approval);
  } catch (error) {
    logger.error('Respond proof request error:', error);
    return res.status(400).json({ error: (error as Error).message || 'Failed to resolve proof request' });
  }
});

router.get('/:approvalId/pdf', roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const generated = await DocumentService.generateProofPdf(req.params.approvalId, req.userId);
    return res.json({
      fileUrl: generated.fileAsset.url,
      fileId: generated.fileAsset.id,
      generatedDocumentId: generated.generated.id,
    });
  } catch (error) {
    logger.error('Proof PDF generation error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to generate proof PDF' });
  }
});

export default router;
