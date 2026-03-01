import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import TaxService from '../services/TaxService.js';

const router = Router();

const quoteSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().optional(),
  invoiceId: z.string().optional(),
  subtotalCents: z.number().int().nonnegative(),
  shippingCents: z.number().int().nonnegative().optional(),
  destination: z
    .object({
      country: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
});

router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));
router.use(requireFeature('tax.enabled'));
router.use(requirePermission('billing.manage'));

router.post('/quote', async (req: AuthRequest, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const quote = await TaxService.quote(parsed.data);
  return res.status(201).json(quote);
});

export default router;
