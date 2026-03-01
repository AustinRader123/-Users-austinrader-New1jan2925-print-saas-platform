import prisma from '../../lib/prisma.js';
import AuditService from '../../services/AuditService.js';
import supplierSyncService from './supplierSyncService.js';
import { SupplierSyncQueue } from '../../queue/SupplierSyncQueue.js';

const SCHEDULER_LOCK_KEY = 913001;

async function withTickTimeout<T>(timeoutMs: number, work: () => Promise<T>): Promise<T> {
  return Promise.race([
    work(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`supplier scheduler tick timed out after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

async function tryAcquireLock() {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_KEY}) AS locked`;
  return Boolean(rows[0]?.locked);
}

async function releaseLock() {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_KEY})`;
}

export async function runSupplierSchedulerTick() {
  const ignoreLock = process.env.SUPPLIER_SCHEDULER_IGNORE_LOCK === 'true';
  let lock = true;
  if (!ignoreLock) {
    lock = await tryAcquireLock();
    if (!lock) {
      return { ok: false, skipped: true, reason: 'lock-not-acquired', scheduled: 0 };
    }
  }

  try {
    return await withTickTimeout(20_000, async () => {
      const now = new Date();
      const due = await prisma.supplierConnection.findMany({
        where: {
          enabled: true,
          syncEnabled: true,
          OR: [{ syncNextAt: null }, { syncNextAt: { lte: now } }],
        },
        orderBy: { updatedAt: 'asc' },
      });

      let scheduled = 0;
      for (const connection of due) {
        const run = await supplierSyncService.createRun(connection);
        SupplierSyncQueue.enqueue(run.id);

        const interval = Math.max(1, connection.syncIntervalMinutes || 1440);
        const nextAt = new Date(now.getTime() + interval * 60_000);

        await prisma.supplierConnection.update({
          where: { id: connection.id },
          data: {
            syncLastAttemptAt: now,
            syncNextAt: nextAt,
          },
        });

        await AuditService.log({
          actorType: 'System',
          action: 'supplier.sync_scheduled',
          entityType: 'SupplierConnection',
          entityId: connection.id,
          meta: {
            runId: run.id,
            storeId: connection.storeId,
            supplier: connection.supplier,
            syncNextAt: nextAt.toISOString(),
          },
        });

        scheduled += 1;
      }

      return { ok: true, skipped: false, scheduled };
    });
  } finally {
    if (!ignoreLock && lock) {
      await releaseLock();
    }
  }
}

export function startSupplierScheduler() {
  let inProgress = false;
  const intervalMs = 60_000;

  const timer = setInterval(async () => {
    if (inProgress) return;
    inProgress = true;
    try {
      await runSupplierSchedulerTick();
    } finally {
      inProgress = false;
    }
  }, intervalMs);

  return () => clearInterval(timer);
}
