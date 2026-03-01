import './modules/dn/syncProcessor.js';
import './queue/ImportQueue.js';
import { startSupplierScheduler } from './modules/suppliers/scheduler.js';

console.log('Worker booting: registering processors');

let stopSupplierScheduler: (() => void) | null = null;
if (process.env.SUPPLIER_SCHEDULER_ENABLED !== 'false') {
  stopSupplierScheduler = startSupplierScheduler();
  console.log('Worker supplier scheduler started');
}

// Keep the process alive to allow Bull to process jobs.
process.on('SIGINT', () => {
  stopSupplierScheduler?.();
  console.log('Worker received SIGINT, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopSupplierScheduler?.();
  console.log('Worker received SIGTERM, exiting');
  process.exit(0);
});

// Prevent the module from exiting immediately
setInterval(() => {}, 1_000 * 60 * 60);
