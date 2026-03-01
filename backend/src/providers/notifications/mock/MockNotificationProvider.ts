import fs from 'node:fs/promises';
import path from 'node:path';
import { NotificationProvider, SendEmailInput, SendSmsInput } from '../NotificationProvider.js';

function logsDir() {
  return path.join(process.cwd(), 'backend', 'uploads', 'logs');
}

async function writeLogFile(prefix: string, payload: Record<string, unknown>) {
  await fs.mkdir(logsDir(), { recursive: true });
  const filePath = path.join(logsDir(), `${prefix}-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

export class MockNotificationProvider implements NotificationProvider {
  async sendEmail(input: SendEmailInput) {
    const logPath = await writeLogFile('mock-email', {
      channel: 'email',
      to: input.to,
      subject: input.subject,
      body: input.body,
      sentAt: new Date().toISOString(),
    });

    return {
      accepted: true,
      provider: 'mock-email',
      messageId: `mock_email_${Date.now()}`,
      channel: 'email',
      logPath,
    };
  }

  async sendSms(input: SendSmsInput) {
    const logPath = await writeLogFile('mock-sms', {
      channel: 'sms',
      to: input.to,
      body: input.body,
      sentAt: new Date().toISOString(),
    });

    return {
      accepted: true,
      provider: 'mock-sms',
      messageId: `mock_sms_${Date.now()}`,
      channel: 'sms',
      logPath,
    };
  }
}

export default MockNotificationProvider;
