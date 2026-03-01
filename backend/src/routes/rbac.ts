import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN', 'STORE_OWNER']));

const roleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).optional(),
});

const assignSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});

router.get('/permissions', async (_req, res) => {
  const rows = await (prisma as any).permission.findMany({ orderBy: { name: 'asc' } });
  res.json(rows);
});

router.get('/roles', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const roles = await (prisma as any).role.findMany({
    where: { tenantId },
    include: {
      permissions: { include: { permission: true } },
      users: { include: { tenantUser: { include: { user: true } } } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(roles);
});

router.post('/roles', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const role = await (prisma as any).role.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  const permissionKeys = parsed.data.permissionKeys || [];
  for (const key of permissionKeys) {
    const permission = await (prisma as any).permission.findUnique({ where: { name: key } });
    if (!permission) continue;
    await (prisma as any).rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  const out = await (prisma as any).role.findFirst({
    where: { id: role.id, tenantId },
    include: { permissions: { include: { permission: true } } },
  });

  res.status(201).json(out);
});

router.put('/roles/:id', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const role = await (prisma as any).role.findFirst({ where: { id: req.params.id, tenantId } });
  if (!role) return res.status(404).json({ error: 'Role not found' });

  await (prisma as any).role.update({
    where: { id: role.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
    },
  });

  await (prisma as any).rolePermission.deleteMany({ where: { roleId: role.id } });
  for (const key of parsed.data.permissionKeys || []) {
    const permission = await (prisma as any).permission.findUnique({ where: { name: key } });
    if (!permission) continue;
    await (prisma as any).rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  }

  const out = await (prisma as any).role.findFirst({
    where: { id: role.id, tenantId },
    include: {
      permissions: { include: { permission: true } },
      users: { include: { tenantUser: { include: { user: true } } } },
    },
  });

  res.json(out);
});

router.post('/assign', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });

  const tenantUser = await (prisma as any).tenantUser.upsert({
    where: { tenantId_userId: { tenantId, userId: parsed.data.userId } },
    update: {},
    create: { tenantId, userId: parsed.data.userId },
  });

  await (prisma as any).tenantUserRole.upsert({
    where: { tenantUserId_roleId: { tenantUserId: tenantUser.id, roleId: parsed.data.roleId } },
    update: {},
    create: { tenantUserId: tenantUser.id, roleId: parsed.data.roleId },
  });

  res.status(201).json({ ok: true });
});

router.get('/users', async (req: AuthRequest, res) => {
  const tenantId = (req as any).tenantId as string | undefined;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const tenantUsers = await (prisma as any).tenantUser.findMany({
    where: { tenantId },
    include: {
      user: { select: { id: true, email: true, name: true, role: true, status: true } },
      roles: { include: { role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(tenantUsers);
});

export default router;
