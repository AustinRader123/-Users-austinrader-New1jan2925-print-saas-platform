import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import ShippingService from '../services/ShippingService.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']));
router.use(requireFeature('shipping.enabled'));

const createLabelSchema = z.object({
  storeId: z.string().min(1),
  carrier: z.string().optional(),
  serviceLevel: z.string().optional(),
  weight: z.number().optional(),
  cost: z.number().optional(),
});

const ratesSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().min(1),
  destination: z.record(z.any()).optional(),
  weightOz: z.number().optional(),
});

const providerLabelSchema = z.object({
  storeId: z.string().min(1),
  orderId: z.string().min(1),
  rateId: z.string().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

router.post('/rates', requirePermission('shipping.view'), async (req: AuthRequest, res) => {
  const parsed = ratesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const rates = await ShippingService.getRates({
    storeId: parsed.data.storeId,
    orderId: parsed.data.orderId,
  });
  return res.json(rates);
});

router.post('/label', requirePermission('shipping.manage'), async (req: AuthRequest, res) => {
  const parsed = providerLabelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const shipment = await ShippingService.createLabel({
    storeId: parsed.data.storeId,
    orderId: parsed.data.orderId,
    rateId: parsed.data.rateId,
  });
  return res.status(201).json(shipment);
});

const eventSchema = z.object({
  storeId: z.string().min(1),
  eventType: z.string().min(1),
  status: z.string().optional(),
  message: z.string().optional(),
  payload: z.any().optional(),
  occurredAt: z.string().datetime().optional(),
});

router.get('/shipments', requirePermission('shipping.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const rows = await ShippingService.listShipments(storeId);
  return res.json(rows);
});

router.get('/shipments/:shipmentId', requirePermission('shipping.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const row = await ShippingService.getShipment(storeId, req.params.shipmentId);
  if (!row) return res.status(404).json({ error: 'Shipment not found' });
  return res.json(row);
});

router.post('/orders/:orderId/label', requirePermission('shipping.manage'), async (req: AuthRequest, res) => {
  const parsed = createLabelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const row = await ShippingService.createLabel({
    storeId: parsed.data.storeId,
    orderId: req.params.orderId,
    carrier: parsed.data.carrier,
    serviceLevel: parsed.data.serviceLevel,
    weight: parsed.data.weight,
    cost: parsed.data.cost,
  });
  return res.status(201).json(row);
});

router.post('/shipments/:shipmentId/events', requirePermission('shipping.manage'), async (req: AuthRequest, res) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  }

  const row = await ShippingService.addEvent({
    storeId: parsed.data.storeId,
    shipmentId: req.params.shipmentId,
    eventType: parsed.data.eventType,
    status: parsed.data.status,
    message: parsed.data.message,
    payload: parsed.data.payload,
    occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined,
  });

  return res.status(201).json(row);
});

router.post('/shipments/:shipmentId/track', requirePermission('shipping.view'), async (req: AuthRequest, res) => {
  const storeId = String(req.body?.storeId || req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const row = await ShippingService.syncTracking({
    storeId,
    shipmentId: req.params.shipmentId,
  });
  return res.json(row);
});

export default router;
