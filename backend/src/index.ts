import { config } from './config.js';
import logger from './logger.js';
import { PrismaClient } from '@prisma/client';
import express from 'express';

const PORT = Number(process.env.PORT) || 3000;

// BOOT TRACE LOGGING (console.log only)
console.log('BOOT 1: start');
console.log('BOOT 2: env loaded');
let appInstance: any;
if (process.env.SAFE_BOOT === 'true') {
  // Minimal app to diagnose event loop blocking
  appInstance = express();
  appInstance.get('/__ping', (req: express.Request, res: express.Response) => res.status(200).send('pong'));
  console.log('BOOT 3: minimal app created');
} else {
  // Full app
  const fullApp = (await import('./app.js')).default;
  appInstance = fullApp;
  console.log('BOOT 3: app created');
  // Start background import queue and requeue pending jobs
  try {
    const { requeuePendingJobs } = await import('./queue/ImportQueue.js');
    await requeuePendingJobs();
    console.log('BOOT 3.1: import queue initialized');
  } catch (e) {
    console.log('BOOT 3.1: import queue init failed', (e as any)?.message || e);
  }
  try {
    const { requeuePendingSupplierSyncRuns } = await import('./queue/SupplierSyncQueue.js');
    await requeuePendingSupplierSyncRuns();
    console.log('BOOT 3.2: supplier sync queue initialized');
  } catch (e) {
    console.log('BOOT 3.2: supplier sync queue init failed', (e as any)?.message || e);
  }
}

const server = appInstance.listen(PORT, '0.0.0.0', () => {
  console.log('BOOT 4: routes registered');
  console.log('BOOT 5: listening');
  logger.info(`🚀 SkuFlow server running on port ${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  logger.info(`API URL: ${config.API_URL}`);

  // Background DB connect with strict timeout (skip in SAFE_BOOT)
  if (process.env.SAFE_BOOT !== 'true') {
    const prisma = new PrismaClient();
    console.log('BOOT 6: db connect start');
    const timeoutMs = 1000;
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('db connect timeout')), timeoutMs));
    Promise.race([prisma.$connect(), timeout])
      .then(() => {
        console.log('BOOT 7: db connect success');
      })
      .catch((err) => {
        console.log('BOOT 7: db connect fail', err?.message || err);
      });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default server;
