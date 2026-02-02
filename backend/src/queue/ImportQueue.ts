import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import VendorImportService from '../services/VendorImportService.js';
import logger from '../logger.js';

const prisma = new PrismaClient();

export type EnqueueParams = {
  jobId: string;
};

class InProcessImportQueue {
  private queue: string[] = [];
  private running = false;

  enqueue(jobId: string) {
    this.queue.push(jobId);
    this.kick();
  }

  private async kick() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const jobId = this.queue.shift()!;
        await this.process(jobId);
      }
    } finally {
      this.running = false;
    }
  }

  private async process(jobId: string) {
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) {
      logger.error(`ImportQueue: job ${jobId} not found`);
      return;
    }
    const uploadsDir = path.resolve(process.cwd(), 'backend', 'uploads', 'import-jobs');
    const filePath = path.join(uploadsDir, `${jobId}.csv`);
    const mappingPath = path.join(uploadsDir, `${jobId}.mapping.json`);
    const whitelistPath = path.join(uploadsDir, `${jobId}.whitelist.json`);
    let mapping: any = {};
    if (fs.existsSync(mappingPath)) {
      try { mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8')); } catch {}
    }
    let whitelist: number[] | undefined = undefined;
    if (fs.existsSync(whitelistPath)) {
      try { whitelist = JSON.parse(fs.readFileSync(whitelistPath, 'utf-8')); } catch {}
    }
    await VendorImportService.runImportJob(jobId, job.vendorId, job.storeId, filePath, mapping, whitelist);
  }
}

export const ImportQueue = new InProcessImportQueue();

export async function requeuePendingJobs() {
  const pending = await prisma.importJob.findMany({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' } });
  for (const job of pending) {
    ImportQueue.enqueue(job.id);
  }
}
