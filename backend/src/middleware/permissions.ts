import { NextFunction, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthRequest } from './auth.js';
import FeatureGateService from '../services/FeatureGateService.js';
import { getUserPermissions } from '../lib/rbac.js';

function getTenantId(req: AuthRequest): string | null {
  const tenantId = (req as any).tenantId || (req.headers['x-tenant-id'] as string | undefined) || (req.query.tenantId as string | undefined);
  return tenantId ? String(tenantId) : null;
}

export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

      if (req.userRole === 'ADMIN' || req.userRole === 'STORE_OWNER') return next();

      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(400).json({ error: 'tenantId required for permission checks' });
      }

      const permissions = await getUserPermissions({
        tenantId,
        userId: req.userId,
        userRole: req.userRole,
      });
      const hasPermission = permissions.includes(permission);

      if (!hasPermission) {
        return res.status(403).json({ error: `Forbidden (missing permission: ${permission})` });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireFeature = (featureKey: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'tenantId required for feature gate checks' });
      const canUse = await FeatureGateService.can(tenantId, featureKey);
      if (!canUse) {
        return res.status(402).json({
          error: 'Plan upgrade required',
          feature: featureKey,
          code: 'PLAN_UPGRADE_REQUIRED',
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
