import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';
import { AuthRequest } from './auth.js';

// Tenant middleware: ensure `req.storeId` is present and canonicalized.
// Sources (in order): auth token (already set by auth middleware), `x-store-id` header, `storeId` query param.
export const tenantMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.storeId) {
      // header override (useful for local/dev testing)
      const header = req.headers['x-store-id'] as string | undefined;
      const q = req.query.storeId as string | undefined;
      if (header) req.storeId = header;
      else if (q) req.storeId = q;
    }

    if (!req.storeId) {
      logger.warn('No storeId found on request — blocking');
      return res.status(400).json({ error: 'storeId required (use x-store-id header or include in token)' });
    }

    // canonicalize: trim
    req.storeId = String(req.storeId).trim();
    next();
  } catch (err) {
    logger.error('tenantMiddleware error:', err);
    res.status(500).json({ error: 'Tenant middleware failure' });
  }
};

export default tenantMiddleware;
