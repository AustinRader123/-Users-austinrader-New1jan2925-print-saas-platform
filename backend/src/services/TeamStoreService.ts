import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TeamStoreService {
  async list(storeId: string) {
    return (prisma as any).teamStore.findMany({
      where: { storeId },
      include: {
        rosterEntries: true,
        personalizationFields: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(input: {
    storeId: string;
    slug: string;
    name: string;
    status?: string;
    closeAt?: string;
    minOrderQty?: number;
    fundraiserPercent?: number;
    groupShipping?: boolean;
    theme?: any;
  }) {
    return (prisma as any).teamStore.create({
      data: {
        storeId: input.storeId,
        slug: input.slug,
        name: input.name,
        status: input.status || 'ACTIVE',
        closeAt: input.closeAt ? new Date(input.closeAt) : null,
        minOrderQty: input.minOrderQty,
        fundraiserPercent: input.fundraiserPercent,
        groupShipping: Boolean(input.groupShipping),
        theme: input.theme,
      },
    });
  }

  async update(id: string, storeId: string, patch: any) {
    return (prisma as any).teamStore.updateMany({
      where: { id, storeId },
      data: {
        ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.closeAt !== undefined ? { closeAt: patch.closeAt ? new Date(patch.closeAt) : null } : {}),
        ...(patch.minOrderQty !== undefined ? { minOrderQty: patch.minOrderQty } : {}),
        ...(patch.fundraiserPercent !== undefined ? { fundraiserPercent: patch.fundraiserPercent } : {}),
        ...(patch.groupShipping !== undefined ? { groupShipping: Boolean(patch.groupShipping) } : {}),
        ...(patch.theme !== undefined ? { theme: patch.theme } : {}),
      },
    });
  }

  async remove(id: string, storeId: string) {
    await (prisma as any).teamStore.deleteMany({ where: { id, storeId } });
    return { ok: true };
  }

  async importRoster(storeId: string, teamStoreId: string, csvContent: string) {
    const lines = csvContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return { imported: 0 };

    const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
    const nameIndex = header.indexOf('name');
    const numberIndex = header.indexOf('number');

    let imported = 0;
    for (const row of lines.slice(1)) {
      const cols = row.split(',').map((col) => col.trim());
      const name = cols[nameIndex >= 0 ? nameIndex : 0];
      const number = numberIndex >= 0 ? cols[numberIndex] : undefined;
      if (!name) continue;

      await (prisma as any).roster.create({
        data: {
          storeId,
          teamStoreId,
          name,
          number,
        },
      });
      imported += 1;
    }

    return { imported };
  }

  async exportOrdersCsv(storeId: string, teamStoreId: string) {
    const rows = await (prisma as any).teamStoreOrderMeta.findMany({
      where: { storeId, teamStoreId },
      include: {
        order: true,
        rosterEntry: true,
      },
      orderBy: { id: 'asc' },
    });

    const header = ['orderNumber', 'customerName', 'customerEmail', 'status', 'rosterName', 'rosterNumber', 'personalization'];
    const lines = [header.join(',')];

    for (const row of rows) {
      lines.push([
        row.order?.orderNumber || '',
        row.order?.customerName || '',
        row.order?.customerEmail || '',
        row.order?.status || '',
        row.rosterEntry?.name || '',
        row.rosterEntry?.number || '',
        JSON.stringify(row.personalization || {}),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    return lines.join('\n');
  }
}

export default new TeamStoreService();
