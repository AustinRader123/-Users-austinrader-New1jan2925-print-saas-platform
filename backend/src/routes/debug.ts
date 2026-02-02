import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const router = Router();
const prisma = new PrismaClient();

// Debug: Get recent mockup jobs (admin/debug only)
router.get('/jobs', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const mockups = await prisma.mockup.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        design: { select: { id: true, name: true, userId: true } },
        productVariant: {
          select: {
            id: true,
            size: true,
            color: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    res.json({
      count: mockups.length,
      jobs: mockups.map((m) => ({
        id: m.id,
        designId: m.designId,
        designName: m.design?.name,
        variantId: m.productVariantId,
        variantName: m.productVariant?.product?.name
          ? `${m.productVariant.product.name} (${m.productVariant.size}, ${m.productVariant.color})`
          : 'Unknown',
        status: m.status,
        createdAt: m.createdAt,
        completedAt: m.updatedAt,
        mockupUrl: (m as any).url || null,
        duration: m.updatedAt
          ? `${((m.updatedAt as any) - (m.createdAt as any)) / 1000}s`
          : 'pending',
      })),
    });
  } catch (error) {
    logger.error('Debug jobs endpoint error', error as Error, { userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Debug: Get cart status
router.get('/carts/:cartId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { cartId } = req.params;

    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
            productVariant: { select: { size: true, color: true } },
            design: { select: { name: true } },
            pricingSnapshot: true,
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    res.json(cart);
  } catch (error) {
    logger.error('Debug cart endpoint error', error as Error, { userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// Debug: Get design details
router.get('/designs/:designId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { designId } = req.params;

    const design = await prisma.design.findUnique({
      where: { id: designId },
      include: {
        assets: true,
        mockups: {
          include: {
            productVariant: { select: { size: true, color: true } },
          },
        },
      },
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json({
      ...design,
      assets: design.assets.map((a) => ({
        id: a.id,
        fileKey: (a as any).url || a.id,
        type: a.type,
        size: a.metadata ? (a.metadata as any).size : 'unknown',
      })),
      mockupCount: design.mockups.length,
      latestMockup: design.mockups[design.mockups.length - 1] || null,
    });
  } catch (error) {
    logger.error('Debug design endpoint error', error as Error, { userId: req.userId });
    res.status(500).json({ error: 'Failed to fetch design' });
  }
});

export default router;
