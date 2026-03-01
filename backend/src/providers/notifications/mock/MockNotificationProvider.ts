import fs from 'node:fs/promises';
import path from 'node:path';

type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

type SendSmsInput = {
  to: string;
  body: string;
};

function logsDir() {
  return path.join(process.cwd(), 'backend', 'uploads', 'logs');
}

async function writeLogFile(prefix: string, payload: Record<string, unknown>) {
  await fs.mkdir(logsDir(), { recursive: true });
  const filePath = path.join(logsDir(), `${prefix}-${Date.now()}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

export class MockNotificationProvider {
  async sendEmail(input: SendEmailInput) {
    const logPath = await writeLogFile('mock-email', {
      channel: 'email',
      to: input.to,
      subject: input.subject,
      body: input.body,
      sentAt: new Date().toISOString(),
    });

    return { ok: true, channel: 'email', providerRef: `mock_email_${Date.now()}`, logPath };
  }

  async sendSms(input: SendSmsInput) {
    const logPath = await writeLogFile('mock-sms', {
      channel: 'sms',
      to: input.to,
      body: input.body,
      sentAt: new Date().toISOString(),
    });

    return { ok: true, channel: 'sms', providerRef: `mock_sms_${Date.now()}`, logPath };
  }
}

export default MockNotificationProvider;
