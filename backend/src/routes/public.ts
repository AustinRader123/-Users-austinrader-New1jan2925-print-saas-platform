import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import PublicStorefrontService from '../services/PublicStorefrontService.js';
import PublicLinkService from '../services/PublicLinkService.js';
import ThemeService from '../services/ThemeService.js';
import FundraisingService from '../services/FundraisingService.js';
import FeatureGateService from '../services/FeatureGateService.js';

const router = Router();
const prisma = new PrismaClient();

type PortalOrderPayload = {
  id: string;
  store: { tenantId?: string | null; name?: string | null };
  invoices?: unknown[];
  shipments?: unknown[];
};

type PublicOrderLookupClient = {
  order: {
    findFirst(args: unknown): Promise<PortalOrderPayload | null>;
  };
};

const publicOrderLookup = prisma as unknown as PublicOrderLookupClient;

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

const createCartSchema = z.object({
  storeSlug: z.string().min(1).optional(),
  storeId: z.string().min(1).optional(),
  fundraiser: z.object({
    campaignId: z.string().optional(),
    campaignSlug: z.string().optional(),
    memberId: z.string().optional(),
    memberCode: z.string().optional(),
    teamStoreId: z.string().optional(),
  }).optional(),
});
const addCartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  qty: z.any().optional(),
  decorationMethod: z.string().optional(),
  decorationLocations: z.array(z.string()).optional(),
  designId: z.string().optional(),
});
const checkoutSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  shippingAddress: z.any(),
  billingAddress: z.any().optional(),
  paymentProvider: z.enum(['NONE', 'STRIPE']).optional(),
  teamStoreMeta: z.object({
    teamStoreId: z.string(),
    rosterEntryId: z.string().optional(),
    personalization: z.any().optional(),
    groupShipping: z.boolean().optional(),
  }).optional(),
});

router.get('/storefront/:storeSlug', publicLimiter, async (req, res) => {
  try {
    const data = await PublicStorefrontService.getStorefront(req.params.storeSlug, req.headers.host as string | undefined);
    return res.json(data);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Storefront not found' });
  }
});

router.get('/campaigns/:slug', publicLimiter, async (req, res) => {
  try {
    const storeSlug = req.query.storeSlug ? String(req.query.storeSlug) : undefined;
    const campaign = await FundraisingService.resolvePublicCampaign({ slug: req.params.slug, storeSlug });
    const leaderboard = await FundraisingService.getLeaderboard(campaign.id);

    return res.json({
      id: campaign.id,
      slug: campaign.slug,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      fundraisingGoalCents: campaign.fundraisingGoalCents,
      shippingMode: campaign.shippingMode,
      allowSplitShip: campaign.allowSplitShip,
      store: campaign.store,
      leaderboard: leaderboard.slice(0, 20),
    });
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Campaign not found' });
  }
});

router.get('/campaigns/:campaignId/leaderboard', publicLimiter, async (req, res) => {
  try {
    const campaign = await FundraisingService.resolvePublicCampaign({ campaignId: req.params.campaignId });
    const leaderboard = await FundraisingService.getLeaderboard(campaign.id);
    return res.json(leaderboard);
  } catch (error) {
    return res.status(404).json({ error: (error as Error).message || 'Campaign not found' });
  }
});

router.get('/products', publicLimiter, async (req, res) => {
  try {
    const storeSlug = String(req.query.storeSlug || '');
    const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
    if (!storeSlug && !storeId && !req.headers.host) return res.status(400).json({ error: 'storeSlug or storeId required' });
    const collection = req.query.collection ? String(req.query.collection) : undefined;
    const products = await PublicStorefrontService.listProducts(storeSlug, collection, req.headers.host as string | undefined, storeId);
    return res.json(products);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to list products' });
  }
});

router.get('/products/:id', publicLimiter, async (req, res) => {
  try {
    const storeSlug = String(req.query.storeSlug || '');
    const storeId = req.query.storeId ? String(req.query.storeId) : undefined;
    if (!storeSlug && !storeId && !req.headers.host) return res.status(400).json({ error: 'storeSlug or storeId required' });
    const product = await PublicStorefrontService.getProduct(storeSlug, req.params.id, req.headers.host as string | undefined, storeId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    return res.json(product);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to get product' });
  }
});

router.post('/cart', publicLimiter, async (req, res) => {
  const parsed = createCartSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  if (!parsed.data.storeSlug && !parsed.data.storeId && !req.headers.host) {
    return res.status(400).json({ error: 'storeSlug or storeId is required' });
  }
  try {
    let fundraiserCampaignId: string | undefined;
    let fundraiserMemberId: string | undefined;
    let fundraiserTeamStoreId: string | undefined;

    const fundraiser = parsed.data.fundraiser;
    if (fundraiser?.campaignId || fundraiser?.campaignSlug) {
      const campaign = await FundraisingService.resolvePublicCampaign({
        campaignId: fundraiser.campaignId,
        slug: fundraiser.campaignSlug,
        storeSlug: parsed.data.storeSlug,
      });
      fundraiserCampaignId = campaign.id;

      if (fundraiser.memberId || fundraiser.memberCode) {
        const member = await (prisma as any).fundraiserCampaignMember.findFirst({
          where: {
            campaignId: campaign.id,
            isActive: true,
            ...(fundraiser.memberId
              ? { id: fundraiser.memberId }
              : { publicCode: fundraiser.memberCode }),
          },
        });
        if (member) fundraiserMemberId = member.id;
      }

      if (fundraiser.teamStoreId) {
        const linked = await (prisma as any).fundraiserCampaignTeamStore.findFirst({
          where: {
            campaignId: campaign.id,
            teamStoreId: fundraiser.teamStoreId,
          },
        });
        if (linked) fundraiserTeamStoreId = fundraiser.teamStoreId;
      }
    }

    const cart = await PublicStorefrontService.createCart(
      parsed.data.storeSlug || '',
      parsed.data.storeId,
      req.headers.host as string | undefined,
      {
        fundraiserCampaignId,
        fundraiserMemberId,
        fundraiserTeamStoreId,
      }
    );
    return res.status(201).json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to create cart' });
  }
});

router.get('/cart/:token', publicLimiter, async (req, res) => {
  try {
    const cart = await PublicStorefrontService.getCartByToken(req.params.token);
    if (!cart) return res.status(404).json({ error: 'Cart not found or expired' });
    return res.json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to get cart' });
  }
});

router.post('/cart/:token/items', publicLimiter, async (req, res) => {
  const parsed = addCartItemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  try {
    const cart = await PublicStorefrontService.addCartItem(req.params.token, parsed.data);
    return res.status(201).json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to add cart item' });
  }
});

router.put('/cart/:token/items/:itemId', publicLimiter, async (req, res) => {
  try {
    const cart = await PublicStorefrontService.updateCartItem(req.params.token, req.params.itemId, {
      quantity: req.body?.quantity != null ? Number(req.body.quantity) : undefined,
      variantId: req.body?.variantId,
    });
    return res.json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to update cart item' });
  }
});

router.delete('/cart/:token/items/:itemId', publicLimiter, async (req, res) => {
  try {
    const cart = await PublicStorefrontService.removeCartItem(req.params.token, req.params.itemId);
    return res.json(cart);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to remove cart item' });
  }
});

router.post('/checkout/:cartToken', checkoutLimiter, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  try {
    const result = await PublicStorefrontService.checkoutCart(req.params.cartToken, {
      ...parsed.data,
      shippingAddress: parsed.data.shippingAddress ?? {},
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Checkout failed' });
  }
});

router.get('/order/:token', publicLimiter, async (req, res) => {
  try {
    const order = await PublicStorefrontService.getOrderByPublicToken(req.params.token);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to get order' });
  }
});

router.get('/portal/:token', publicLimiter, async (req, res) => {
  try {
    const order = await (publicOrderLookup.order.findFirst({
      where: { publicToken: req.params.token },
      include: {
        store: true,
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        invoices: {
          include: {
            lines: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        shipments: {
          include: {
            events: { orderBy: { occurredAt: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
      } as any,
    }));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!order.store?.tenantId) return res.status(404).json({ error: 'Portal unavailable' });
    const portalEnabled = await FeatureGateService.can(String(order.store.tenantId), 'portal.enabled');
    if (!portalEnabled) return res.status(404).json({ error: 'Portal unavailable' });

    return res.json({
      order,
      invoices: order.invoices || [],
      shipments: order.shipments || [],
      store: order.store,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to fetch portal data' });
  }
});

router.get('/quote/:token', publicLimiter, async (req, res) => {
  try {
    const row = await PublicLinkService.resolveQuoteByToken(req.params.token);
    if (!row) return res.status(404).json({ error: 'Quote not found or expired' });
    return res.json({
      quote: row.quote,
      store: row.quote.store,
      expiresAt: row.expiresAt,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to fetch quote link' });
  }
});

router.get('/invoice/:token', publicLimiter, async (req, res) => {
  try {
    const row = await PublicLinkService.resolveInvoiceByToken(req.params.token);
    if (!row) return res.status(404).json({ error: 'Invoice not found or expired' });
    const [invoices, shipments] = await Promise.all([
      (prisma as any).invoice.findMany({
        where: { orderId: row.order.id },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      }),
      (prisma as any).shipment.findMany({
        where: { orderId: row.order.id },
        include: { events: { orderBy: { occurredAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return res.json({
      order: row.order,
      invoices,
      shipments,
      store: row.order.store,
      expiresAt: row.expiresAt,
    });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Failed to fetch invoice link' });
  }
});

router.get('/theme-preview', publicLimiter, async (req, res) => {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).json({ error: 'token is required' });
    const result = await ThemeService.getDraftForPreviewToken(token);
    const storefront = await (prisma as any).storefront.findFirst({ where: { storeId: result.storeId }, orderBy: { updatedAt: 'desc' } });
    return res.json({
      storeId: result.storeId,
      draft: result.draft,
      storefront,
    });
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message || 'Invalid preview token' });
  }
});

export default router;
