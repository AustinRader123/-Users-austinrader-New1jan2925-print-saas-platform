import './modules/dn/syncProcessor.js';
import './queue/ImportQueue.js';

console.log('Worker booting: registering processors');

// Keep the process alive to allow Bull to process jobs.
process.on('SIGINT', () => {
  console.log('Worker received SIGINT, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Worker received SIGTERM, exiting');
  process.exit(0);
});

// Prevent the module from exiting immediately
setInterval(() => {}, 1_000 * 60 * 60);
