import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requireFeature, requirePermission } from '../middleware/permissions.js';
import PricingRuleService from '../services/PricingRuleService.js';
import logger from '../logger.js';

const router = Router();
router.use(authMiddleware);
router.use(requirePermission('pricing.manage'));
router.use(requireFeature('advancedPricing.enabled'));

const storeScopedSchema = z.object({
  storeId: z.string().min(1),
});

const createRuleSetSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  metadata: z.any().optional(),
});

const updateRuleSetSchema = createRuleSetSchema.partial().extend({
  storeId: z.string().min(1),
});

const createRuleSchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(1),
  method: z.string().min(1),
  priority: z.number().int().optional(),
  conditions: z.any().optional(),
  effects: z.any().optional(),
  active: z.boolean().optional(),
});

const updateRuleSchema = createRuleSchema.partial().extend({
  storeId: z.string().min(1),
});

const evaluateSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qty: z.number().int().positive(),
  decorationMethod: z.string().optional(),
  locations: z.array(z.string()).optional(),
  printSizeTier: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  colorCount: z.number().int().positive().optional(),
  stitchCount: z.number().int().nonnegative().optional(),
  rush: z.boolean().optional(),
  weightOz: z.number().nonnegative().optional(),
  userId: z.string().optional(),
  includeMargin: z.boolean().optional(),
  personalizationFees: z.array(z.object({ name: z.string().min(1), amount: z.number() })).optional(),
});

const shippingRateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  active: z.boolean().optional(),
  minSubtotal: z.number().nullable().optional(),
  maxSubtotal: z.number().nullable().optional(),
  baseCharge: z.number().optional(),
  perItemCharge: z.number().optional(),
  perOzCharge: z.number().optional(),
  rushMultiplier: z.number().optional(),
  metadata: z.any().optional(),
});

const taxRateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  jurisdiction: z.string().optional(),
  active: z.boolean().optional(),
  rate: z.number().nonnegative(),
  appliesShipping: z.boolean().optional(),
  metadata: z.any().optional(),
});

const upsertShippingSchema = z.object({
  storeId: z.string().min(1),
  rates: z.array(shippingRateSchema),
});

const upsertTaxSchema = z.object({
  storeId: z.string().min(1),
  rates: z.array(taxRateSchema),
});

function parseOr400<T>(schema: z.ZodType<T>, payload: unknown, res: Response): T | null {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

function resolveStoreId(req: AuthRequest): string | null {
  return (req.storeId as string) || (req.query.storeId as string) || (req.body?.storeId as string) || null;
}

router.get('/rulesets', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const ruleSets = await PricingRuleService.listRuleSets(body.storeId);
    res.json(ruleSets);
  } catch (error) {
    logger.error('Pricing rule set list error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list pricing rule sets' });
  }
});

router.post('/rulesets', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(createRuleSetSchema, req.body, res);
    if (!body) return;

    const created = await PricingRuleService.createRuleSet(body.storeId, body);
    res.status(201).json(created);
  } catch (error) {
    logger.error('Pricing rule set create error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create pricing rule set' });
  }
});

router.put('/rulesets/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(updateRuleSetSchema, req.body, res);
    if (!body) return;

    const updated = await PricingRuleService.updateRuleSet(body.storeId, req.params.id, body);
    res.json(updated);
  } catch (error) {
    logger.error('Pricing rule set update error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update pricing rule set' });
  }
});

router.post('/rulesets/:id/rules', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(createRuleSchema, req.body, res);
    if (!body) return;

    const rule = await PricingRuleService.createRule(body.storeId, req.params.id, body);
    res.status(201).json(rule);
  } catch (error) {
    logger.error('Pricing rule create error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create pricing rule' });
  }
});

router.put('/rules/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(updateRuleSchema, req.body, res);
    if (!body) return;

    const rule = await PricingRuleService.updateRule(body.storeId, req.params.id, body);
    res.json(rule);
  } catch (error) {
    logger.error('Pricing rule update error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update pricing rule' });
  }
});

router.delete('/rules/:id', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, req.body?.storeId ? req.body : req.query, res);
    if (!body) return;

    const result = await PricingRuleService.deleteRule(body.storeId, req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Pricing rule delete error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to delete pricing rule' });
  }
});

router.post('/evaluate', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(evaluateSchema, req.body, res);
    if (!body) return;

    const breakdown = await PricingRuleService.evaluate(body);
    res.json(breakdown);
  } catch (error) {
    logger.error('Pricing evaluate error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to evaluate pricing' });
  }
});

router.get('/shipping-rates', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;
    const rates = await PricingRuleService.listShippingRates(body.storeId);
    res.json(rates);
  } catch (error) {
    logger.error('Pricing shipping rates list error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list shipping rates' });
  }
});

router.put('/shipping-rates', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(upsertShippingSchema, req.body, res);
    if (!body) return;
    const rates = await PricingRuleService.upsertShippingRates(body.storeId, body.rates);
    res.json(rates);
  } catch (error) {
    logger.error('Pricing shipping rates upsert error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update shipping rates' });
  }
});

router.get('/tax-rates', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;
    const rates = await PricingRuleService.listTaxRates(body.storeId);
    res.json(rates);
  } catch (error) {
    logger.error('Pricing tax rates list error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list tax rates' });
  }
});

router.put('/tax-rates', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(upsertTaxSchema, req.body, res);
    if (!body) return;
    const rates = await PricingRuleService.upsertTaxRates(body.storeId, body.rates);
    res.json(rates);
  } catch (error) {
    logger.error('Pricing tax rates upsert error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update tax rates' });
  }
});

export default router;
