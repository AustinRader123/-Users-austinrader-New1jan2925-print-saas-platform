import { runSupplierSchedulerTick, startSupplierScheduler } from '../modules/suppliers/scheduler.js';

const runOnce = process.argv.includes('--once') || process.env.SUPPLIER_SCHEDULER_ONCE === 'true';

async function main() {
  if (runOnce) {
    const result = await runSupplierSchedulerTick();
    console.log(JSON.stringify(result));
    process.exit(0);
  }

  console.log('Supplier scheduler started (60s interval)');
  const stop = startSupplierScheduler();

  process.on('SIGINT', () => {
    stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
