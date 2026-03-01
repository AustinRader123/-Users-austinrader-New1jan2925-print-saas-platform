import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import QuoteService from '../services/QuoteService.js';
import ProductionService from '../services/ProductionService.js';
import DocumentService from '../services/DocumentService.js';
import PublicLinkService from '../services/PublicLinkService.js';
import EmailService from '../services/EmailService.js';
import logger from '../logger.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const storeScopedSchema = z.object({
  storeId: z.string().min(1),
});

const createQuoteSchema = z.object({
  storeId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  notes: z.string().optional(),
});

const updateQuoteSchema = createQuoteSchema.partial().extend({
  storeId: z.string().min(1),
});

const addItemSchema = z.object({
  storeId: z.string().min(1),
  productId: z.string().min(1),
  variantId: z.string().optional(),
  qty: z.object({
    units: z.number().int().positive(),
  }).passthrough(),
  decorationMethod: z.string().optional(),
  decorationLocations: z.array(z.string()).optional(),
  decorationInput: z.any().optional(),
  printSizeTier: z.enum(['SMALL', 'MEDIUM', 'LARGE']).optional(),
  colorCount: z.number().int().positive().optional(),
  stitchCount: z.number().int().nonnegative().optional(),
  rush: z.boolean().optional(),
  weightOz: z.number().nonnegative().optional(),
  description: z.string().optional(),
});

const statusSchema = z.object({
  storeId: z.string().min(1),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'REJECTED', 'EXPIRED', 'CONVERTED']),
});

function resolveStoreId(req: AuthRequest): string | null {
  return (req.storeId as string) || (req.query.storeId as string) || (req.body?.storeId as string) || null;
}

function parseOr400<T>(schema: z.ZodType<T>, payload: unknown, res: Response): T | null {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const quotes = await QuoteService.listQuotes(body.storeId);
    res.json(quotes);
  } catch (error) {
    logger.error('List quotes error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to list quotes' });
  }
});

router.post('/', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(createQuoteSchema, req.body, res);
    if (!body) return;

    const quote = await QuoteService.createQuote(body.storeId, body);
    res.status(201).json(quote);
  } catch (error) {
    logger.error('Create quote error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to create quote' });
  }
});

router.get('/:quoteId', async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const quote = await QuoteService.getQuote(body.storeId, req.params.quoteId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json(quote);
  } catch (error) {
    logger.error('Get quote error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to get quote' });
  }
});

router.put('/:quoteId', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(updateQuoteSchema, req.body, res);
    if (!body) return;

    const quote = await QuoteService.updateQuote(body.storeId, req.params.quoteId, body);
    res.json(quote);
  } catch (error) {
    logger.error('Update quote error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update quote' });
  }
});

router.put('/:quoteId/status', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(statusSchema, req.body, res);
    if (!body) return;

    const quote = await QuoteService.updateStatus(body.storeId, req.params.quoteId, body.status);
    res.json(quote);
  } catch (error) {
    logger.error('Update quote status error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to update quote status' });
  }
});

router.post('/:quoteId/items', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(addItemSchema, req.body, res);
    if (!body) return;

    const lineItem = await QuoteService.addLineItem(body.storeId, req.params.quoteId, body);

    res.status(201).json(lineItem);
  } catch (error) {
    logger.error('Add quote item error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to add quote item' });
  }
});

router.post('/:quoteId/convert', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const order = await QuoteService.convertToOrder(body.storeId, req.params.quoteId, req.userId!);
    await ProductionService.createProductionJob(order.id);

    res.status(201).json(order);
  } catch (error) {
    logger.error('Convert quote error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to convert quote' });
  }
});

router.post('/:quoteId/reprice', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const quote = await QuoteService.repriceQuote(body.storeId, req.params.quoteId);
    res.json(quote);
  } catch (error) {
    logger.error('Reprice quote error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to reprice quote' });
  }
});

router.get('/:quoteId/pdf', roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;
    const quote = await QuoteService.getQuote(body.storeId, req.params.quoteId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    const generated = await DocumentService.generateQuotePdf(req.params.quoteId, req.userId);
    return res.json({
      fileUrl: generated.fileAsset.url,
      fileId: generated.fileAsset.id,
      generatedDocumentId: generated.generated.id,
    });
  } catch (error) {
    logger.error('Quote PDF generation error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to generate quote PDF' });
  }
});

router.post('/:quoteId/send', roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const body = parseOr400(storeScopedSchema, { storeId: resolveStoreId(req) }, res);
    if (!body) return;

    const quote = await QuoteService.getQuote(body.storeId, req.params.quoteId);
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    if (!quote.customerEmail) return res.status(400).json({ error: 'Quote customer email is required' });

    await DocumentService.generateQuotePdf(quote.id, req.userId);
    const tenantId = (req as any).tenantId as string;
    const token = await PublicLinkService.createQuoteToken(quote.id, Number(req.body?.expiresHours || 168), tenantId);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
    const proto = String(req.headers['x-forwarded-proto'] || 'https');
    const publicUrl = `${proto}://${host}/quote/${token}`;

    const message = await EmailService.queueAndSend({
      tenantId,
      storeId: quote.storeId,
      type: 'QUOTE_SENT',
      toEmail: quote.customerEmail,
      subject: `Your quote ${quote.quoteNumber} is ready`,
      bodyText: `Hello ${quote.customerName || 'there'}, your quote is ready. View quote: ${publicUrl}`,
      meta: { quoteId: quote.id, publicUrl },
    });

    await QuoteService.updateStatus(quote.storeId, quote.id, 'SENT');

    return res.json({
      ok: true,
      publicUrl,
      emailMessageId: message.id,
    });
  } catch (error) {
    logger.error('Quote send error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to send quote' });
  }
});

export default router;
