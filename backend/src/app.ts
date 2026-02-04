import express, { Express } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import { config } from './config.js';
import logger from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { PrismaClient } from '@prisma/client';

// Routes - to be added
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import designRoutes from './routes/designs.js';
import cartRoutes from './routes/cart.js';
import ordersRoutes from './routes/orders.js';
import pricingRoutes from './routes/pricing.js';
import productionRoutes from './routes/production.js';
import vendorRoutes from './routes/vendors.js';
import adminRoutes from './routes/admin.js';
import adminPricingRulesRoutes from './routes/admin_pricing_rules.js';
import importJobsRoutes from './routes/import_jobs.js';
import paymentsRoutes from './routes/payments.js';
import debugRoutes from './routes/debug.js';

const app: Express = express();

// CORS configuration: prod restricts by CORS_ORIGIN, dev permissive
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];
const isProd = (process.env.NODE_ENV || 'development') === 'production';
const corsOptions: CorsOptions = isProd
  ? {
      origin: (origin, callback) => {
        // Allow non-browser requests and exact matches
        if (!origin || allowedOrigins.includes(origin) || devOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }
  : { origin: true, credentials: true };

// Ultra-safe ping registered BEFORE any middleware
// Must respond instantly and never touch DB or other async layers
app.get('/__ping', (req, res) => {
  res.status(200).send('pong');
});

// Middleware - RequestID must be first
app.use((req: any, res: any, next: any) => requestIdMiddleware(req, res, next));
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check (Render health path)
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API health check (useful for frontend hitting /api base)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness probe - checks DB quickly with strict timeout
const readyPrisma = new PrismaClient();
app.get('/ready', async (req, res) => {
  const timeoutMs = 1000;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ready timeout')), timeoutMs));
  try {
    await Promise.race([
      readyPrisma.$executeRawUnsafe('SELECT 1'),
      timeout,
    ]);
    return res.status(200).json({ ready: true, timestamp: new Date() });
  } catch (err: any) {
    return res.status(503).json({ ready: false, error: err?.message || 'unknown', timestamp: new Date() });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', optionalAuthMiddleware, productRoutes);
app.use('/api/designs', authMiddleware, designRoutes);
app.use('/api/cart', optionalAuthMiddleware, cartRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api', paymentsRoutes);
app.use('/api/pricing', optionalAuthMiddleware, pricingRoutes);
app.use('/api/production', authMiddleware, productionRoutes);
app.use('/api/vendors', authMiddleware, vendorRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/admin/pricing-rules', authMiddleware, adminPricingRulesRoutes);
app.use('/api', importJobsRoutes);
app.use('/api/debug', debugRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
