import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import AuthService from '../services/AuthService.js';
import logger from '../logger.js';
import { getUserPermissions } from '../lib/rbac.js';

const router = Router();
type AuthRequestWithTenant = AuthRequest & { tenantId?: string };

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await AuthService.register(email, password, name || '');
    res.json(result);
  } catch (error) {
    logger.error('Register error:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await AuthService.getUser(req.userId!);
    const tenantId = (req as AuthRequestWithTenant).tenantId || null;
    const permissions = await getUserPermissions({ tenantId, userId: req.userId, userRole: req.userRole });
    res.json({
      ...user,
      tenantId,
      permissions,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
