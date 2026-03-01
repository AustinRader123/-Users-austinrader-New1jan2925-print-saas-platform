import prisma from '../lib/prisma.js';
import supplierSyncService from '../modules/suppliers/supplierSyncService.js';

const RETRY_DELAYS_MS = [2000, 5000, 10000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class InProcessSupplierSyncQueue {
  private queue: string[] = [];
  private running = false;

  enqueue(runId: string) {
    this.queue.push(runId);
    this.kick();
  }

  private async kick() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const runId = this.queue.shift()!;
        await this.process(runId);
      }
    } finally {
      this.running = false;
    }
  }

  private async process(runId: string) {
    let attempt = 0;
    while (attempt <= RETRY_DELAYS_MS.length) {
      const result = await supplierSyncService.runSync(runId);
      if (result.status === 'SUCCEEDED') {
        return;
      }
      if (attempt === RETRY_DELAYS_MS.length) {
        return;
      }
      const delay = RETRY_DELAYS_MS[attempt];
      attempt += 1;
      await wait(delay);
    }
  }
}

export const SupplierSyncQueue = new InProcessSupplierSyncQueue();

export async function requeuePendingSupplierSyncRuns() {
  const pendingRuns = await prisma.supplierSyncRun.findMany({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  for (const pending of pendingRuns) {
    SupplierSyncQueue.enqueue(pending.id);
  }
}
