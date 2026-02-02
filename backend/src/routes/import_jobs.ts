import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, roleMiddleware } from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';
import { ImportQueue } from '../queue/ImportQueue.js';
import fs from 'fs';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// Get job details
router.get('/import-jobs/:jobId', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Not found' });
    const percent = job.totalRows > 0 ? Math.floor((job.processedRows / job.totalRows) * 100) : 0;
    res.json({ ...job, percent });
  } catch (error) {
    logger.error('Get import job error:', error);
    res.status(500).json({ error: 'Failed to get import job' });
  }
});

// Paginated errors
router.get('/import-jobs/:jobId/errors', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = parseInt(String((req.query?.limit as any) ?? '20')) || 20;
    const where = { jobId };
    let errors;
    if (cursor) {
      errors = await prisma.importJobError.findMany({ where, take: limit, skip: 1, cursor: { id: cursor }, orderBy: { createdAt: 'asc' } });
    } else {
      errors = await prisma.importJobError.findMany({ where, take: limit, orderBy: { createdAt: 'asc' } });
    }
    res.json(errors);
  } catch (error) {
    logger.error('List import job errors error:', error);
    res.status(500).json({ error: 'Failed to list import job errors' });
  }
});

// Errors CSV download
router.get('/import-jobs/:jobId/errors.csv', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const errs = await prisma.importJobError.findMany({ where: { jobId }, orderBy: { rowNumber: 'asc' } });
    const header = ['rowNumber','message','field','code','rawRow'];
    const rows = errs.map(e => {
      const raw = e.rawRow ? JSON.stringify(e.rawRow).replace(/"/g,'""') : '';
      return `${e.rowNumber},"${e.message.replace(/"/g,'""')}",${e.field || ''},${e.code || ''},"${raw}"`;
    });
    const csv = [header.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="import-job-${jobId}-errors.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Download errors CSV error:', error);
    res.status(500).json({ error: 'Failed to download errors CSV' });
  }
});

// Retry failed rows: creates a new job and enqueues only failed rowNumbers
router.post('/import-jobs/:jobId/retry', authMiddleware, roleMiddleware(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const prev = await prisma.importJob.findUnique({ where: { id: jobId } });
    if (!prev) return res.status(404).json({ error: 'Not found' });
    const failedErrors = await prisma.importJobError.findMany({ where: { jobId }, select: { rowNumber: true } });
    const rowWhitelist = failedErrors.map(e => e.rowNumber);
    if (rowWhitelist.length === 0) return res.status(400).json({ error: 'No failed rows to retry' });
    const newJob = await prisma.importJob.create({ data: { vendorId: prev.vendorId, storeId: prev.storeId, status: 'QUEUED', sourceFilename: prev.sourceFilename } });
    // Persist whitelist to a JSON next to CSV for worker to pick up, and copy original CSV to new job path
    const uploadsDir = pathResolveUploads();
    const prevCsv = path.join(uploadsDir, `${jobId}.csv`);
    const newCsv = path.join(uploadsDir, `${newJob.id}.csv`);
    if (fs.existsSync(prevCsv)) {
      fs.copyFileSync(prevCsv, newCsv);
    }
    const wlPath = pathResolveWhitelist(newJob.id);
    fs.writeFileSync(wlPath, JSON.stringify(rowWhitelist));
    ImportQueue.enqueue(newJob.id);
    res.status(200).json({ newJobId: newJob.id });
  } catch (error) {
    logger.error('Retry import job error:', error);
    res.status(500).json({ error: 'Failed to retry import job' });
  }
});

function pathResolveUploads() {
  const p = path.resolve(process.cwd(), 'backend', 'uploads', 'import-jobs');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}
function pathResolveWhitelist(jobId: string) {
  const dir = pathResolveUploads();
  return path.join(dir, `${jobId}.whitelist.json`);
}

export default router;
