import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import logger from '../logger.js';

const prisma = new PrismaClient();
const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']));

function resolveStoreId(req: AuthRequest): string | null {
  return (req.storeId as string) || (req.query.storeId as string) || (req.body?.storeId as string) || null;
}

function resolveRange(req: AuthRequest) {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(String(req.query.to)) : new Date();
  return { from, to };
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const { from, to } = resolveRange(req);

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: from, lte: to },
      },
      include: { items: true },
    });

    const quotes = await prisma.quote.findMany({
      where: {
        storeId,
        createdAt: { gte: from, lte: to },
      },
      include: { lineItems: true },
    });

    const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const subtotal = orders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
    const tax = orders.reduce((sum, order) => sum + Number(order.taxAmount || 0), 0);
    const shipping = orders.reduce((sum, order) => sum + Number(order.shippingCost || 0), 0);

    const orderCosts = orders.reduce((sum, order) => {
      return sum + (order.items || []).reduce((itemSum, item) => {
        const snap = (item.pricingSnapshot || {}) as any;
        return itemSum + Number(snap.total || item.totalPrice || 0);
      }, 0);
    }, 0);

    const quoteValue = quotes.reduce((sum, quote) => sum + Number(quote.total || 0), 0);
    const projectedProfit = revenue - orderCosts;

    res.json({
      storeId,
      from,
      to,
      metrics: {
        orderCount: orders.length,
        quoteCount: quotes.length,
        revenue: Number(revenue.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        shipping: Number(shipping.toFixed(2)),
        quoteValue: Number(quoteValue.toFixed(2)),
        orderCosts: Number(orderCosts.toFixed(2)),
        projectedProfit: Number(projectedProfit.toFixed(2)),
        marginPct: revenue > 0 ? Number(((projectedProfit / revenue) * 100).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    logger.error('Reports summary error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to load report summary' });
  }
});

router.get('/products', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const { from, to } = resolveRange(req);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          storeId,
          createdAt: { gte: from, lte: to },
        },
      },
      include: {
        product: { select: { id: true, name: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    const grouped = new Map<string, any>();
    for (const item of items) {
      const key = item.productId;
      const current = grouped.get(key) || {
        productId: item.productId,
        productName: item.product?.name || item.productId,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
      const snapshot = (item.pricingSnapshot || {}) as any;
      const lineCost = Number(snapshot.total || item.totalPrice || 0);
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.totalPrice || 0);
      current.cost += lineCost;
      current.profit += Number(item.totalPrice || 0) - lineCost;
      grouped.set(key, current);
    }

    const rows = Array.from(grouped.values())
      .map((row) => ({
        ...row,
        revenue: Number(row.revenue.toFixed(2)),
        cost: Number(row.cost.toFixed(2)),
        profit: Number(row.profit.toFixed(2)),
        marginPct: row.revenue > 0 ? Number(((row.profit / row.revenue) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json(rows);
  } catch (error) {
    logger.error('Reports products error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to load product report' });
  }
});

router.get('/export/orders.csv', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const { from, to } = resolveRange(req);

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['orderId', 'orderNumber', 'status', 'subtotal', 'taxAmount', 'shippingCost', 'totalAmount', 'createdAt'];
    const lines = [header.join(',')];
    for (const order of orders) {
      lines.push([
        csvEscape(order.id),
        csvEscape(order.orderNumber),
        csvEscape(order.status),
        csvEscape(order.subtotal),
        csvEscape(order.taxAmount),
        csvEscape(order.shippingCost),
        csvEscape(order.totalAmount),
        csvEscape(order.createdAt.toISOString()),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-report-${storeId}.csv"`);
    res.status(200).send(lines.join('\n'));
  } catch (error) {
    logger.error('Reports orders CSV error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to export orders CSV' });
  }
});

router.get('/export/quotes.csv', async (req: AuthRequest, res: Response) => {
  try {
    const storeId = resolveStoreId(req);
    if (!storeId) return res.status(400).json({ error: 'storeId is required' });
    const { from, to } = resolveRange(req);

    const quotes = await prisma.quote.findMany({
      where: {
        storeId,
        createdAt: { gte: from, lte: to },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['quoteId', 'quoteNumber', 'status', 'customerEmail', 'subtotal', 'total', 'createdAt'];
    const lines = [header.join(',')];
    for (const quote of quotes) {
      lines.push([
        csvEscape(quote.id),
        csvEscape(quote.quoteNumber),
        csvEscape(quote.status),
        csvEscape(quote.customerEmail),
        csvEscape(quote.subtotal),
        csvEscape(quote.total),
        csvEscape(quote.createdAt.toISOString()),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="quotes-report-${storeId}.csv"`);
    res.status(200).send(lines.join('\n'));
  } catch (error) {
    logger.error('Reports quotes CSV error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to export quotes CSV' });
  }
});

export default router;
