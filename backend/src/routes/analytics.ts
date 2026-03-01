import { Router } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import prisma from '../lib/prisma.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']));
router.use(requirePermission('reports.view'));

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const text = String(value).replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
}

router.get('/summary', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const [orders, events] = await Promise.all([
    prisma.order.findMany({ where: { storeId }, select: { id: true, createdAt: true, totalAmount: true } }),
    (prisma as any).eventLog.findMany({ where: { storeId }, select: { eventType: true } }),
  ]);

  const byDay = new Map<string, number>();
  for (const order of orders) {
    const day = order.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }

  const revenue = orders.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);

  return res.json({
    storeId,
    revenue: Number(revenue.toFixed(2)),
    ordersCount: orders.length,
    ordersPerDay: Array.from(byDay.entries()).map(([date, count]) => ({ date, count })),
    eventsCount: events.length,
  });
});

router.get('/funnel', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const [quotes, orders, paidEvents, shippedEvents] = await Promise.all([
    prisma.quote.count({ where: { storeId } }),
    prisma.order.count({ where: { storeId } }),
    (prisma as any).eventLog.count({ where: { storeId, eventType: 'payment.receipt' } }),
    (prisma as any).eventLog.count({ where: { storeId, eventType: 'shipment.created' } }),
  ]);

  return res.json({
    storeId,
    quote: quotes,
    order: orders,
    paid: paidEvents,
    shipped: shippedEvents,
  });
});

router.get('/top-products', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const rows = await prisma.orderItem.findMany({
    where: { order: { storeId } },
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      product: { select: { name: true } },
    },
  });

  const grouped = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();
  for (const row of rows) {
    const existing = grouped.get(row.productId) || {
      productId: row.productId,
      productName: row.product?.name || row.productId,
      quantity: 0,
      revenue: 0,
    };
    existing.quantity += Number(row.quantity || 0);
    existing.revenue += Number(row.totalPrice || 0);
    grouped.set(row.productId, existing);
  }

  const list = Array.from(grouped.values())
    .map((row) => ({ ...row, revenue: Number(row.revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 20);

  return res.json(list);
});

router.get('/export.csv', async (req: AuthRequest, res) => {
  const storeId = String(req.query.storeId || req.storeId || '').trim();
  if (!storeId) return res.status(400).json({ error: 'storeId required' });

  const rows = await (prisma as any).eventLog.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const header = ['eventId', 'storeId', 'eventType', 'actorType', 'actorId', 'entityType', 'entityId', 'createdAt'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([
      csvEscape(row.id),
      csvEscape(row.storeId),
      csvEscape(row.eventType),
      csvEscape(row.actorType),
      csvEscape(row.actorId),
      csvEscape(row.entityType),
      csvEscape(row.entityId),
      csvEscape(new Date(row.createdAt).toISOString()),
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${storeId}.csv"`);
  return res.status(200).send(lines.join('\n'));
});

export default router;
