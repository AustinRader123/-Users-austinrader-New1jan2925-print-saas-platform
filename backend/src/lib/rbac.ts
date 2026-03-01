import prisma from './prisma.js';

const OWNER_LIKE_ROLES = new Set(['ADMIN', 'STORE_OWNER']);

export async function getUserPermissions(input: { tenantId?: string | null; userId?: string; userRole?: string | null }) {
  const tenantId = input.tenantId ? String(input.tenantId) : null;
  const userId = input.userId ? String(input.userId) : null;
  const userRole = input.userRole ? String(input.userRole) : null;

  if (!tenantId || !userId) return [] as string[];

  if (userRole && OWNER_LIKE_ROLES.has(userRole)) {
    const all = await (prisma as any).permission.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
    return all.map((row: any) => String(row.name));
  }

  const tenantUser = await (prisma as any).tenantUser.findFirst({
    where: { tenantId, userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const permissionSet = new Set<string>();
  for (const roleLink of tenantUser?.roles || []) {
    for (const rolePermission of roleLink?.role?.permissions || []) {
      const name = rolePermission?.permission?.name;
      if (name) permissionSet.add(String(name));
    }
  }

  return Array.from(permissionSet).sort((a, b) => a.localeCompare(b));
}

export function hasPermission(permissionList: string[], permission: string) {
  return permissionList.includes(permission);
}
