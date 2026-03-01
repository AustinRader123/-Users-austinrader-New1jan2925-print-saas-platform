import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import OrderService from '../services/OrderService.js';
import ProductionService from '../services/ProductionService.js';
import DocumentService from '../services/DocumentService.js';
import EmailService from '../services/EmailService.js';
import PublicLinkService from '../services/PublicLinkService.js';
import NetworkRoutingService from '../services/NetworkRoutingService.js';
import logger from '../logger.js';

const router = Router();

// Create order
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { storeId, cartId, shippingData } = req.body;

    if (!storeId || !cartId || !shippingData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await OrderService.createOrder(storeId, req.userId!, cartId, shippingData);

    // Auto-create production job
    if (order) {
      await ProductionService.createProductionJob(order.id);
    }

    res.status(201).json(order);
  } catch (error) {
    logger.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order
router.get('/:orderId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const order = await OrderService.getOrder(req.params.orderId);

    // Check ownership
    if (order && order.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// List user orders
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orders = await OrderService.listUserOrders(req.userId!);
    res.json(orders);
  } catch (error) {
    logger.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

router.post('/:orderId/reprice', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const storeId = req.body?.storeId || req.query?.storeId || req.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' });
    }
    const order = await OrderService.repriceOrder(req.params.orderId, String(storeId));
    res.json(order);
  } catch (error) {
    logger.error('Reprice order error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to reprice order' });
  }
});

router.get('/:orderId/invoice.pdf', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const order = await OrderService.getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const generated = await DocumentService.generateInvoicePdf(order.id, req.userId);
    return res.json({
      fileUrl: generated.fileAsset.url,
      fileId: generated.fileAsset.id,
      generatedDocumentId: generated.generated.id,
    });
  } catch (error) {
    logger.error('Generate invoice PDF error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to generate invoice PDF' });
  }
});

router.post('/:orderId/send-invoice', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER']), async (req: AuthRequest, res: Response) => {
  try {
    const order = await OrderService.getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await DocumentService.generateInvoicePdf(order.id, req.userId);
    const tenantId = (req as any).tenantId as string;
    const token = await PublicLinkService.createInvoiceToken(order.id, Number(req.body?.expiresHours || 168), tenantId);
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
    const proto = String(req.headers['x-forwarded-proto'] || 'https');
    const publicUrl = `${proto}://${host}/invoice/${token}`;

    const message = await EmailService.queueAndSend({
      tenantId,
      storeId: order.storeId,
      type: 'ORDER_CONFIRMATION',
      toEmail: order.customerEmail,
      subject: `Invoice for order ${order.orderNumber}`,
      bodyText: `Hello ${order.customerName || 'there'}, your invoice is ready: ${publicUrl}`,
      meta: { orderId: order.id, publicUrl },
    });

    return res.json({ ok: true, publicUrl, emailMessageId: message.id });
  } catch (error) {
    logger.error('Send invoice error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to send invoice' });
  }
});

router.post('/:orderId/status', authMiddleware, roleMiddleware(['ADMIN', 'STORE_OWNER', 'PRODUCTION_MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const status = String(req.body?.status || '').toUpperCase();
    if (!status) return res.status(400).json({ error: 'status is required' });
    const order = await OrderService.getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = await OrderService.updateOrderStatus(order.id, status);
    await NetworkRoutingService.syncRoutedOrderFromOrderStatus(order.id, status);
    const tenantId = (req as any).tenantId as string;
    await EmailService.queueAndSend({
      tenantId,
      storeId: order.storeId,
      type: 'STATUS_UPDATE',
      toEmail: order.customerEmail,
      subject: `Order ${order.orderNumber} status update`,
      bodyText: `Your order status is now: ${status}`,
      meta: { orderId: order.id, status },
    });

    return res.json(updated);
  } catch (error) {
    logger.error('Update order status error:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to update order status' });
  }
});

export default router;
