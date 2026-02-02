import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import OrderService from '../services/OrderService.js';
import ProductionService from '../services/ProductionService.js';
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

export default router;
