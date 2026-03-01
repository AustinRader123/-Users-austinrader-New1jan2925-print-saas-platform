import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { config } from './config.js';
import logger from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import tenantMiddleware from './middleware/tenant.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { PrismaClient } from '@prisma/client';

import dnExplore from "./routes/dn_explore.js";
import dnSync from "./routes/dn_sync.js";
import dnConnections from "./routes/dn_connections.js";
import path from 'path';
// Routes - to be added
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import variantsRoutes from './routes/variants.js';
import imagesRoutes from './routes/images.js';
import designRoutes from './routes/designs.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import quotesRoutes from './routes/quotes.js';
import pricingRoutes from './routes/pricing.js';
import productionRoutes from './routes/production.js';
import proofsRoutes from './routes/proofs.js';
import vendorRoutes from './routes/vendors.js';
import dnConnectionsRoutes from "./routes/dn_connections.js";
import dnSyncRoutes from "./routes/dn_sync.js";
import adminRoutes from './routes/admin.js';
import adminSuppliersRoutes from './routes/admin_suppliers.js';
import adminPricingRulesRoutes from './routes/admin_pricing_rules.js';
import importJobsRoutes from './routes/import_jobs.js';
import paymentsRoutes from './routes/payments.js';
import debugRoutes from './routes/debug.js';
import dnExploreRoutes from "./routes/dn_explore.js";
import storageRoutes from './routes/storage.js';
import publicRoutes from './routes/public.js';
import onboardingRoutes from './routes/onboarding.js';
import themeRoutes from './routes/theme.js';
import communicationsRoutes from './routes/communications.js';
import documentsRoutes from './routes/documents.js';
import teamStoreRoutes from './routes/team-stores.js';
import inventoryRoutes from './routes/inventory.js';
import purchaseOrderRoutes from './routes/purchase-orders.js';
import purchasingRoutes from './routes/purchasing.js';
import webhooksRoutes from './routes/webhooks.js';
import notificationsRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import reportsRoutes from './routes/reports.js';
import billingRoutes from './routes/billing.js';
import orderBillingRoutes from './routes/order-billing.js';
import domainsRoutes from './routes/domains.js';
import rbacRoutes from './routes/rbac.js';
import navigationRoutes from './routes/navigation.js';
import customizerRoutes from './routes/customizer.js';
import publicCustomizerRoutes from './routes/public-customizer.js';
import networkRoutes from './routes/network.js';
import fundraisingRoutes from './routes/fundraising.js';
import productionV2Routes from './routes/production-v2.js';
import shippingRoutes from './routes/shipping.js';
import shippingWebhookRoutes from './routes/shipping-webhooks.js';
import taxRoutes from './routes/tax.js';
import paymentsWebhookRoutes from './routes/payments-webhooks.js';
import { PROD, assertProdDatabaseUrlGuards, isProductionRuntime } from './config/prod.js';

const app: Express = express();
app.disable('x-powered-by');

// CORS configuration: prod restricts by CORS_ORIGINS/CORS_ORIGIN, dev permissive
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const isProd = isProductionRuntime();
if (isProd && PROD.strictCors && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGINS (or CORS_ORIGIN) must be set in production');
}
const commonHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Correlation-ID'];
const corsOptions: CorsOptions = isProd
  ? {
      origin: (origin, callback) => {
        // Allow non-browser requests and explicit allowlisted origins only
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      allowedHeaders: commonHeaders,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      optionsSuccessStatus: 204,
    }
  : { origin: true, credentials: true, allowedHeaders: commonHeaders };

// Ultra-safe ping registered BEFORE any middleware
// Must respond instantly and never touch DB or other async layers
app.get('/__ping', (req, res) => {
  res.status(200).send('pong');
});

// Middleware - RequestID must be first
app.use((req: any, res: any, next: any) => requestIdMiddleware(req, res, next));
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}
if (isProd && PROD.trustProxy) {
  app.set('trust proxy', 1);
}
app.use(
  helmet({
    hsts: isProd
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: false,
  })
);
app.use(cors(corsOptions));
// Ensure preflight requests are handled on all routes
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Basic rate limiting for production safety
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: PROD.rateLimitAuth.windowMs,
  max: PROD.rateLimitAuth.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const publicLimiter = rateLimit({
  windowMs: PROD.rateLimitPublic.windowMs,
  max: PROD.rateLimitPublic.max,
  standardHeaders: true,
  legacyHeaders: false,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check (Render health path)
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// API health check (useful for frontend hitting /api base)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Serve uploaded files in dev from backend/uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

// Readiness probe - checks DB quickly with strict timeout
const readyPrisma = new PrismaClient();
app.get('/ready', async (req, res) => {
  try {
    if (isProd && PROD.requireDatabaseUrl) {
      assertProdDatabaseUrlGuards(process.env.DATABASE_URL || '');
    }
  } catch (error: any) {
    return res.status(503).json({ ready: false, error: error?.message || 'invalid database config', timestamp: new Date() });
  }

  const timeoutMs = 1000;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ready timeout')), timeoutMs));
  try {
    await Promise.race([
      readyPrisma.$executeRawUnsafe('SELECT 1'),
      readyPrisma.$executeRawUnsafe('SELECT COUNT(*) FROM "_prisma_migrations"'),
      timeout,
    ]);
    return res.status(200).json({ ready: true, timestamp: new Date() });
  } catch (err: any) {
    return res.status(503).json({ ready: false, error: err?.message || 'unknown', timestamp: new Date() });
  }
});

// API Routes
// Run optional auth + tenant resolution for all /api routes so handlers can rely on `req.storeId`.
app.use('/api', optionalAuthMiddleware, tenantMiddleware);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', optionalAuthMiddleware, productRoutes);
app.use('/api/variants', variantsRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/designs', authMiddleware, designRoutes);
app.use('/api/cart', optionalAuthMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api/quotes', authMiddleware, quotesRoutes);
app.use('/api', paymentsRoutes);
app.use('/api/pricing', optionalAuthMiddleware, pricingRoutes);
app.use('/api/production', authMiddleware, productionRoutes);
app.use('/api/proofs', proofsRoutes);
app.use('/api/vendors', authMiddleware, vendorRoutes);
app.use('/api/dn/connections', authMiddleware, dnConnectionsRoutes);
app.use('/api/dn', authMiddleware, dnSyncRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin', authMiddleware, adminSuppliersRoutes);
app.use('/api/suppliers', authMiddleware, (req, _res, next) => {
  req.url = `/suppliers${req.url}`;
  next();
}, adminSuppliersRoutes);
app.use('/api/admin/pricing-rules', authMiddleware, adminPricingRulesRoutes);
app.use('/api', importJobsRoutes);
app.use('/api/dn', authMiddleware, dnExploreRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/public', publicLimiter, publicRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/theme', themeRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/team-stores', teamStoreRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/purchasing', purchasingRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/billing', authMiddleware, billingRoutes);
app.use('/api/order-billing', authMiddleware, orderBillingRoutes);
app.use('/api/domains', authMiddleware, domainsRoutes);
app.use('/api/rbac', authMiddleware, rbacRoutes);
app.use('/api/navigation', authMiddleware, navigationRoutes);
app.use('/api/customizer', authMiddleware, customizerRoutes);
app.use('/api/public/customizer', publicCustomizerRoutes);
app.use('/api/network', authMiddleware, networkRoutes);
app.use('/api/fundraising', authMiddleware, fundraisingRoutes);
app.use('/api/production-v2', productionV2Routes);
app.use('/api/payments', webhookLimiter, paymentsWebhookRoutes);
app.use('/api/shipping', webhookLimiter, shippingWebhookRoutes);
app.use('/api/shipping', authMiddleware, shippingRoutes);
app.use('/api/tax', authMiddleware, taxRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
