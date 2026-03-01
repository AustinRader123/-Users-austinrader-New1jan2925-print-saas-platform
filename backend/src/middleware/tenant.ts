import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';
import { AuthRequest } from './auth.js';
import prisma from '../lib/prisma.js';
import { runWithTenant } from '../lib/tenantContext.js';

// Tenant middleware: resolve `tenantId` for the request and establish context.
// Sources (in priority): `x-tenant-id` header, `x-store-id` header (map store -> tenant), `tenantId` query param.
export const tenantMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.path.startsWith('/proofs/public/') || req.path.startsWith('/public/')) {
      return next();
    }

    // header override (useful for local/dev testing)
    const headerTenant = req.headers['x-tenant-id'] as string | undefined;
    const headerStore = req.headers['x-store-id'] as string | undefined;
    const qTenant = req.query.tenantId as string | undefined;

    let tenantId: string | undefined = headerTenant || qTenant;

    if (!tenantId && headerStore) {
      // attempt to resolve store -> tenant
      const store = await prisma.store.findUnique({ where: { id: headerStore } });
      tenantId = store?.tenantId ?? undefined;
      if (!tenantId) {
        logger.warn('store provided but no tenantId found for store', { storeId: headerStore });
      }
    }

    // If auth middleware added a storeId on the request, try to resolve tenant from it
    if (!tenantId && req.storeId) {
      const store = await prisma.store.findUnique({ where: { id: req.storeId } });
      tenantId = store?.tenantId ?? undefined;
    }

    // Public storefront endpoints are token/slug-based and may not include tenant headers.
    // Resolve tenant from request path/body/query for these routes.
    if (!tenantId && req.path.startsWith('/public/')) {
      const hostHeader = String(req.headers.host || '').toLowerCase();

      if (!tenantId && hostHeader) {
        const host = hostHeader.split(':')[0];
        if (host && host !== 'localhost' && host !== '127.0.0.1') {
          const domain = await (prisma as any).storeDomain.findFirst({
            where: { hostname: host, status: 'ACTIVE' },
            include: { store: true },
          });
          tenantId = (domain as any)?.store?.tenantId ?? undefined;
        }
      }

      // /public/storefront/:storeSlug
      const storefrontMatch = req.path.match(/^\/public\/storefront\/([^/]+)$/);
      if (storefrontMatch?.[1]) {
        const store = await prisma.store.findFirst({ where: { slug: decodeURIComponent(storefrontMatch[1]) } });
        tenantId = store?.tenantId ?? undefined;
      }

      // /public/products and /public/products/:id use ?storeSlug=...
      if (!tenantId) {
        const storeSlug = (req.query.storeSlug as string | undefined) || (req.body?.storeSlug as string | undefined);
        const storeId = (req.query.storeId as string | undefined) || (req.body?.storeId as string | undefined);
        if (storeId) {
          const store = await prisma.store.findUnique({ where: { id: storeId } });
          tenantId = store?.tenantId ?? undefined;
        }
        if (storeSlug) {
          const store = await prisma.store.findFirst({ where: { slug: storeSlug } });
          tenantId = store?.tenantId ?? undefined;
        }
      }

      // /public/cart POST body {storeSlug}
      if (!tenantId && req.path === '/public/cart') {
        const storeSlug = req.body?.storeSlug as string | undefined;
        const storeId = req.body?.storeId as string | undefined;
        if (storeId) {
          const store = await prisma.store.findUnique({ where: { id: storeId } });
          tenantId = store?.tenantId ?? undefined;
        }
        if (storeSlug) {
          const store = await prisma.store.findFirst({ where: { slug: storeSlug } });
          tenantId = store?.tenantId ?? undefined;
        }
      }

      // /public/cart/:token, /public/cart/:token/items, /public/checkout/:cartToken
      if (!tenantId) {
        const cartTokenMatch = req.path.match(/^\/public\/(?:cart|checkout)\/([^/]+)/);
        if (cartTokenMatch?.[1]) {
          const cart = await prisma.cart.findFirst({ where: { token: cartTokenMatch[1] }, include: { store: true } as any });
          tenantId = (cart as any)?.store?.tenantId ?? undefined;
        }
      }

      // /public/order/:token
      if (!tenantId) {
        const orderTokenMatch = req.path.match(/^\/public\/order\/([^/]+)$/);
        if (orderTokenMatch?.[1]) {
          const order = await prisma.order.findFirst({ where: { publicToken: orderTokenMatch[1] }, include: { store: true } as any });
          tenantId = (order as any)?.store?.tenantId ?? undefined;
        }
      }
    }

    if (!tenantId) {
      logger.warn('No tenantId found on request — blocking');
      return res.status(400).json({ error: 'tenantId required (use x-tenant-id header or associate store with tenant)' });
    }

    // canonicalize
    tenantId = String(tenantId).trim();

    // Establish AsyncLocalStorage context for Prisma middleware and downstream handlers
    return runWithTenant(tenantId, () => {
      // expose tenantId for handlers
      (req as any).tenantId = tenantId;
      (res.locals as any).tenantId = tenantId;
      next();
    });
  } catch (err) {
    logger.error('tenantMiddleware error:', err);
    res.status(500).json({ error: 'Tenant middleware failure' });
  }
};

export default tenantMiddleware;
