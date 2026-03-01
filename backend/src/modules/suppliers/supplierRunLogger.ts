import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

export class SupplierRunLogger {
  readonly runId: string;
  readonly filePath: string;

  constructor(runId: string) {
    this.runId = runId;
    const dir = path.join(ROOT, 'artifacts', 'logs', 'supplier-sync');
    fs.mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, `${runId}.log`);
  }

  log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
    const row = {
      ts: new Date().toISOString(),
      runId: this.runId,
      level,
      message,
      ...(meta ? { meta } : {}),
    };
    fs.appendFileSync(this.filePath, `${JSON.stringify(row)}\n`, 'utf8');
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.log('error', message, meta);
  }
}

export default SupplierRunLogger;
