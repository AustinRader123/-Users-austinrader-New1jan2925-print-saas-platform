import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  designId?: string;
  jobId?: string;
  variantId?: string;
  cartId?: string;
  cartItemId?: string;
  [key: string]: string | number | boolean | undefined;
}

class StructuredLogger {
  private fileStream = fs.createWriteStream(path.join(logsDir, 'server.log'), { flags: 'a' });

  private formatLog(level: string, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  private write(entry: string) {
    this.fileStream.write(entry + '\n');
    // Also log to console for development
    console.log(entry);
  }

  info(message: string, context?: LogContext) {
    this.write(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: LogContext) {
    this.write(this.formatLog('WARN', message, context));
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack,
    };
    this.write(this.formatLog('ERROR', message, errorContext));
  }

  debug(message: string, context?: LogContext) {
    if (process.env.DEBUG) {
      this.write(this.formatLog('DEBUG', message, context));
    }
  }
}

export default new StructuredLogger();
