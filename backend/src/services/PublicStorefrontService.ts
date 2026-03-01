import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import PricingRuleService from './PricingRuleService.js';
import InventoryService from './InventoryService.js';
import ProductionService from './ProductionService.js';
import WebhookService from './WebhookService.js';
import AuditService from './AuditService.js';
import ProofService from './ProofService.js';
import EmailService from './EmailService.js';
import NetworkRoutingService from './NetworkRoutingService.js';

const prisma: any = new PrismaClient();

function randomToken(size = 24) {
  return crypto.randomBytes(size).toString('hex');
}

function createOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export class PublicStorefrontService {
  async resolveStore(input: { storeSlug?: string; storeId?: string; host?: string }) {
    const normalizedHost = String(input.host || '').toLowerCase().split(':')[0];

    if (normalizedHost) {
      const byDomain = await (prisma as any).storeDomain.findFirst({
        where: { hostname: normalizedHost, status: 'ACTIVE' },
        include: { store: { select: { id: true, slug: true, name: true, status: true } } },
      });
      if (byDomain?.store) return byDomain.store;
    }

    if (input.storeId) {
      const byId = await prisma.store.findFirst({ where: { id: input.storeId }, select: { id: true, slug: true, name: true, status: true } });
      if (byId) return byId;
    }

    if (input.storeSlug) {
      const bySlug = await prisma.store.findFirst({ where: { slug: input.storeSlug }, select: { id: true, slug: true, name: true, status: true } });
      if (bySlug) return bySlug;
    }

    throw new Error('Store not found');
  }

  async resolveStoreBySlug(storeSlug: string, host?: string) {
    const store = await this.resolveStore({ storeSlug, host });
    if (!store) throw new Error('Store not found');
    return store;
  }

  async getStorefront(storeSlug: string, host?: string) {
    const store = await this.resolveStoreBySlug(storeSlug, host);
    const [publishedTheme, branding] = await Promise.all([
      (prisma as any).themeConfig.findFirst({
        where: { storeId: store.id, NOT: { publishedAt: null } },
        orderBy: { publishedAt: 'desc' },
      }),
      (prisma as any).storeBranding.findUnique({ where: { storeId: store.id } }),
    ]);

    const storefront = await (prisma as any).storefront.findFirst({
      where: { storeId: store.id, status: 'ACTIVE' },
      include: {
        collections: {
          include: {
            products: {
              include: {
                product: { include: { images: { take: 1 }, variants: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      store: {
        ...store,
        branding: branding
          ? {
              companyName: branding.companyName,
              supportEmail: branding.supportEmail,
              footerLinks: branding.footerLinks,
            }
          : null,
      },
      storefront: storefront
        ? {
            ...storefront,
            themeConfig: publishedTheme?.config || storefront.theme || null,
            footerLinks: (branding?.footerLinks as any) || [],
            trustBadges: ((storefront.theme as any)?.trustBadges as any) || [],
          }
        : null,
    };
  }

  async listProducts(storeSlug: string, collectionSlug?: string, host?: string, storeId?: string) {
    const store = await this.resolveStore({ storeSlug, host, storeId });

    if (collectionSlug) {
      const collection = await (prisma as any).collection.findFirst({
        where: { storeId: store.id, slug: collectionSlug },
        include: {
          products: {
            include: {
              product: { include: { images: true, variants: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!collection) return [];
      return collection.products.map((entry: any) => entry.product);
    }

    return prisma.product.findMany({
      where: { storeId: store.id, status: 'ACTIVE' },
      include: { images: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProduct(storeSlug: string, idOrSlug: string, host?: string, storeId?: string) {
    const store = await this.resolveStore({ storeSlug, host, storeId });
    return prisma.product.findFirst({
      where: {
        storeId: store.id,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: { images: true, variants: true },
    });
  }

  async createCart(storeSlug: string, storeId?: string, host?: string) {
    const store = await this.resolveStore({ storeSlug, storeId, host });
    return prisma.cart.create({
      data: {
        storeId: store.id,
        token: randomToken(),
        status: 'ACTIVE',
        total: 0,
      },
      include: { items: true },
    });
  }

  async getCartByToken(token: string) {
    return prisma.cart.findFirst({
      where: { token, status: { in: ['ACTIVE'] } },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
            productVariant: true,
            design: true,
          },
        },
      },
    });
  }

  async addCartItem(cartToken: string, payload: {
    productId: string;
    variantId?: string;
    quantity?: number;
    qty?: any;
    decorationMethod?: string;
    decorationLocations?: string[];
    designId?: string;
  }) {
    const cart = await this.getCartByToken(cartToken);
    if (!cart || !cart.storeId) throw new Error('Cart not found or expired');

    const product = await prisma.product.findFirst({ where: { id: payload.productId, storeId: cart.storeId } });
    if (!product) throw new Error('Product not found');

    const variant = payload.variantId
      ? await prisma.productVariant.findFirst({ where: { id: payload.variantId, storeId: cart.storeId, productId: product.id } })
      : await prisma.productVariant.findFirst({ where: { productId: product.id, storeId: cart.storeId }, orderBy: { createdAt: 'asc' } });

    if (!variant) throw new Error('Variant not found');

    const quantity = Math.max(1, Number(payload.quantity || payload.qty?.units || 1));
    const pricing = await PricingRuleService.evaluate({
      storeId: cart.storeId,
      productId: product.id,
      variantId: variant.id,
      qty: quantity,
      decorationMethod: payload.decorationMethod,
      locations: payload.decorationLocations,
    });

    await prisma.cartItem.create({
      data: {
        storeId: cart.storeId,
        cartId: cart.id,
        productId: product.id,
        variantId: variant.id,
        productVariantId: variant.id,
        qty: payload.qty || { units: quantity },
        quantity,
        decorationMethod: payload.decorationMethod,
        decorationLocations: payload.decorationLocations || [],
        designId: payload.designId,
        pricingSnapshotData: pricing,
      } as any,
    });

    await this.recalculateCartTotal(cart.id);
    return this.getCartByToken(cartToken);
  }

  async updateCartItem(cartToken: string, itemId: string, payload: { quantity?: number; variantId?: string }) {
    const cart = await this.getCartByToken(cartToken);
    if (!cart || !cart.storeId) throw new Error('Cart not found or expired');

    const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new Error('Cart item not found');

    const quantity = payload.quantity != null ? Math.max(1, payload.quantity) : item.quantity;
    const variantId = payload.variantId || item.productVariantId;

    const pricing = await PricingRuleService.evaluate({
      storeId: cart.storeId,
      productId: item.productId,
      variantId,
      qty: quantity,
      decorationMethod: (item as any).decorationMethod || undefined,
      locations: ((item as any).decorationLocations as string[]) || [],
    });

    await prisma.cartItem.update({
      where: { id: item.id },
      data: {
        productVariantId: variantId,
        variantId,
        quantity,
        qty: { units: quantity } as any,
        pricingSnapshotData: pricing,
      } as any,
    });

    await this.recalculateCartTotal(cart.id);
    return this.getCartByToken(cartToken);
  }

  async removeCartItem(cartToken: string, itemId: string) {
    const cart = await this.getCartByToken(cartToken);
    if (!cart) throw new Error('Cart not found or expired');

    await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    await this.recalculateCartTotal(cart.id);
    return this.getCartByToken(cartToken);
  }

  async checkoutCart(cartToken: string, payload: {
    customerEmail: string;
    customerName: string;
    shippingAddress: any;
    billingAddress?: any;
    paymentProvider?: 'NONE' | 'STRIPE';
    teamStoreMeta?: {
      teamStoreId: string;
      rosterEntryId?: string;
      personalization?: any;
      groupShipping?: boolean;
    };
  }) {
    const cart = await this.getCartByToken(cartToken);
    if (!cart || !cart.storeId) throw new Error('Cart not found or expired');
    if (!payload.customerEmail || !payload.customerName || !payload.shippingAddress) {
      throw new Error('Missing checkout fields');
    }
    if (!cart.items.length) throw new Error('Cart is empty');

    if (payload.teamStoreMeta?.teamStoreId) {
      const teamStore = await (prisma as any).teamStore.findFirst({ where: { id: payload.teamStoreMeta.teamStoreId, storeId: cart.storeId } });
      if (!teamStore) throw new Error('Team store not found');
      if (teamStore.closeAt && new Date(teamStore.closeAt).getTime() <= Date.now()) {
        throw new Error('Team store is closed');
      }
    }

    const passwordHash = crypto.createHash('sha256').update(`portal:${payload.customerEmail}`).digest('hex');
    const user = await prisma.user.upsert({
      where: { email: payload.customerEmail },
      update: { name: payload.customerName || undefined },
      create: {
        email: payload.customerEmail,
        name: payload.customerName,
        passwordHash,
        role: 'CUSTOMER',
      },
    });

    const totals = {
      subtotal: Number(cart.total || 0),
      taxAmount: 0,
      shippingCost: 0,
      totalAmount: Number(cart.total || 0),
    };

    const checkoutSession = await (prisma as any).checkoutSession.create({
      data: {
        storeId: cart.storeId,
        cartId: cart.id,
        status: 'PAID',
        customerEmail: payload.customerEmail,
        shippingAddress: payload.shippingAddress,
        billingAddress: payload.billingAddress,
        totals,
        paymentProvider: payload.paymentProvider || 'NONE',
        token: randomToken(),
      },
    });

    const needsProof = cart.items.some((item: any) => Boolean(item.designId || item.decorationMethod || item.customizationId));

    const order = await prisma.order.create({
      data: {
        storeId: cart.storeId,
        userId: user.id,
        orderNumber: createOrderNumber(),
        status: needsProof ? 'PENDING' : 'CONFIRMED',
        fulfillmentStatus: needsProof ? 'proof_needed' : 'new',
        paymentStatus: 'PAID',
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        shippingCost: totals.shippingCost,
        totalAmount: totals.totalAmount,
        customerEmail: payload.customerEmail,
        customerName: payload.customerName,
        shippingAddress: payload.shippingAddress,
        billingAddress: payload.billingAddress,
        publicToken: randomToken(),
      },
    });

    const createdOrderItems: Array<{ id: string; customizationId?: string | null; designId?: string | null }> = [];
    for (const item of cart.items as any[]) {
      const snapshot = item.pricingSnapshotData || item.pricingSnapshot?.breakdown || null;
      const lineSnapshot = snapshot
        ? {
            ...snapshot,
            customizationId: item.customizationId || null,
            customization: item.customizationJson || null,
            previewFileId: item.previewFileId || null,
          }
        : null;
      const lineUnit = Number(snapshot?.total || snapshot?.subtotal || item.quantity || 0) / Math.max(1, item.quantity);
      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          productVariantId: item.productVariantId,
          designId: item.designId || undefined,
          mockupUrl: item.mockupUrl || undefined,
          mockupPreviewUrl: item.mockupUrl || undefined,
          quantity: item.quantity,
          unitPrice: Number(lineUnit.toFixed(2)),
          totalPrice: Number((lineUnit * item.quantity).toFixed(2)),
          pricingSnapshot: lineSnapshot,
        },
      });

      if (item.customizationId) {
        await (prisma as any).customization.update({
          where: { id: item.customizationId },
          data: {
            status: 'ORDERED',
          },
        });
      }

      createdOrderItems.push({ id: orderItem.id, customizationId: item.customizationId || null, designId: item.designId || null });
    }

    await (prisma as any).checkoutSession.update({
      where: { id: checkoutSession.id },
      data: { orderId: order.id, status: 'PAID' },
    });

    await prisma.cart.update({ where: { id: cart.id }, data: { status: 'CONVERTED' } });

    const customizedItem = createdOrderItems.find((item) => Boolean(item.customizationId));
    if (customizedItem) {
      const approval = await ProofService.createRequest({
        storeId: cart.storeId,
        orderId: order.id,
        designId: customizedItem.designId || undefined,
        recipientEmail: payload.customerEmail,
        message: 'Please review and approve your customization proof before production.',
        expiresHours: 72,
      });

      const store = await prisma.store.findUnique({ where: { id: cart.storeId }, select: { tenantId: true } });
      const tenantId = store?.tenantId;
      if (tenantId && approval.recipientEmail) {
        const appBase = String(process.env.PUBLIC_APP_URL || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const publicUrl = `${appBase}/proof/${approval.token}`;
        await EmailService.queueAndSend({
          tenantId,
          storeId: cart.storeId,
          type: 'PROOF_REQUEST',
          toEmail: approval.recipientEmail,
          subject: `Proof approval required for order ${order.orderNumber}`,
          bodyText: `Please review your customization proof: ${publicUrl}`,
          meta: {
            orderId: order.id,
            approvalId: approval.id,
            publicUrl,
          },
        });
      }
    }

    if (payload.teamStoreMeta?.teamStoreId) {
      await (prisma as any).teamStoreOrderMeta.create({
        data: {
          storeId: cart.storeId,
          orderId: order.id,
          teamStoreId: payload.teamStoreMeta.teamStoreId,
          rosterEntryId: payload.teamStoreMeta.rosterEntryId,
          personalization: {
            ...(payload.teamStoreMeta.personalization || {}),
            groupShipping: Boolean(payload.teamStoreMeta.groupShipping),
          },
        },
      });
    }

    await InventoryService.reserveForOrder(order.id);
    await ProductionService.createProductionJob(order.id);
    await NetworkRoutingService.routeOrder(order.id);

    await WebhookService.publish({
      storeId: cart.storeId,
      eventType: 'order.created',
      payload: { orderId: order.id, orderNumber: order.orderNumber, totalAmount: order.totalAmount },
    });

    await AuditService.log({
      actorType: 'Customer',
      actorUserId: user.id,
      action: 'checkout.order_created',
      entityType: 'Order',
      entityId: order.id,
      meta: { cartId: cart.id, checkoutSessionId: checkoutSession.id },
    });

    return {
      checkoutSession,
      orderToken: order.publicToken,
      orderId: order.id,
    };
  }

  async getOrderByPublicToken(token: string) {
    return prisma.order.findFirst({
      where: { publicToken: token },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
            design: true,
          },
        },
        productionJobs: true,
        proofApprovals: true,
      },
    });
  }

  private async recalculateCartTotal(cartId: string) {
    const items = await prisma.cartItem.findMany({ where: { cartId } });
    const total = items.reduce((sum: number, item: any) => {
      const snap = item.pricingSnapshotData || null;
      const lineTotal = Number(snap?.total || snap?.subtotal || (item.quantity || 0));
      return sum + lineTotal;
    }, 0);

    await prisma.cart.update({ where: { id: cartId }, data: { total: Number(total.toFixed(2)) } });
  }
}

export default new PublicStorefrontService();
