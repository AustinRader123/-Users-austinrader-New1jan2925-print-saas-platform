import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import OrderBillingService from '../services/OrderBillingService.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requireFeature('billing.enabled'));

const createInvoiceSchema = z.object({
  storeId: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const paymentSchema = z.object({
  storeId: z.string().min(1),
  amountCents: z.number().int().positive(),
  currency: z.string().optional(),
  description: z.string().optional(),
  externalRef: z.string().optional(),
  metadata: z.any().optional(),
});

router.get('/invoices', requirePermission('billing.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const rows = await OrderBillingService.listInvoices(storeId);
  return res.json(rows);
});

router.get('/invoices/:invoiceId', requirePermission('billing.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const row = await OrderBillingService.getInvoice(storeId, req.params.invoiceId);
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  return res.json(row);
});

router.get('/ledger', requirePermission('billing.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const invoiceId = req.query.invoiceId ? String(req.query.invoiceId) : undefined;
  const rows = await OrderBillingService.getLedger(storeId, invoiceId);
  return res.json(rows);
});

router.post('/orders/:orderId/invoice', requirePermission('billing.manage'), async (req: AuthRequest, res) => {
  const parsed = createInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const row = await OrderBillingService.ensureInvoiceForOrder({
    storeId: parsed.data.storeId,
    orderId: req.params.orderId,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    notes: parsed.data.notes,
  });
  return res.status(201).json(row);
});

router.post('/invoices/:invoiceId/payments', requirePermission('billing.manage'), async (req: AuthRequest, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const row = await OrderBillingService.recordPayment({
    storeId: parsed.data.storeId,
    invoiceId: req.params.invoiceId,
    amountCents: parsed.data.amountCents,
    currency: parsed.data.currency,
    description: parsed.data.description,
    externalRef: parsed.data.externalRef,
    metadata: parsed.data.metadata,
  });

  return res.status(201).json(row);
});

export default router;
