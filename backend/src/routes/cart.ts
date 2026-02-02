import { Router, Response } from 'express';
import { AuthRequest, optionalAuthMiddleware, authMiddleware } from '../middleware/auth.js';
import CartService from '../services/CartService.js';
import logger from '../logger.js';

const router = Router();

// Get or create cart
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    const cart = await CartService.getOrCreateCart(req.userId, sessionId);

    const details = await CartService.getCartDetails(cart.id);
    res.json(details);
  } catch (error) {
    logger.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to get cart' });
  }
});

// Add item to cart
router.post('/items', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { cartId, productId, variantId, quantity, designId, mockupUrl } = req.body;

    if (!cartId || !productId || !variantId || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = await CartService.addItem(
      cartId,
      productId,
      variantId,
      quantity,
      designId,
      mockupUrl
    );

    const cart = await CartService.getCartDetails(cartId);
    res.status(201).json(cart);
  } catch (error) {
    logger.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// Update item quantity
router.put('/items/:itemId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    await CartService.updateCartItemQuantity(req.params.itemId, quantity);
    res.json({ success: true });
  } catch (error) {
    logger.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Remove item from cart
router.delete('/items/:itemId', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await CartService.removeItem(req.params.itemId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Abandon cart
router.post('/:cartId/abandon', async (req: AuthRequest, res: Response) => {
  try {
    await CartService.abandonCart(req.params.cartId);
    res.json({ success: true });
  } catch (error) {
    logger.error('Abandon cart error:', error);
    res.status(500).json({ error: 'Failed to abandon cart' });
  }
});

export default router;
