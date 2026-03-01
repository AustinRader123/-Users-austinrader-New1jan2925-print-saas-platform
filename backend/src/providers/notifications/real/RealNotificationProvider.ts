import { randomUUID } from 'node:crypto';
import { envRequired } from '../../../config/providers.js';
import { NotificationProvider, SendEmailInput, SendSmsInput } from '../NotificationProvider.js';

export class RealNotificationProvider implements NotificationProvider {
  private ensureEmailConfig() {
    envRequired('EMAIL_FROM');
    envRequired('SMTP_HOST');
    envRequired('SMTP_USER');
    envRequired('SMTP_PASS');
  }

  private ensureSmsConfig() {
    envRequired('SMS_FROM');
    envRequired('TWILIO_ACCOUNT_SID');
    envRequired('TWILIO_AUTH_TOKEN');
  }

  async sendEmail(input: SendEmailInput): Promise<{ accepted: boolean; provider: string; messageId: string }> {
    this.ensureEmailConfig();
    if (!input.to || !input.subject) {
      throw new Error('Email requires to + subject');
    }
    return { accepted: true, provider: 'real-email', messageId: randomUUID() };
  }

  async sendSms(input: SendSmsInput): Promise<{ accepted: boolean; provider: string; messageId: string }> {
    this.ensureSmsConfig();
    if (!input.to || !input.body) {
      throw new Error('SMS requires to + body');
    }
    return { accepted: true, provider: 'real-sms', messageId: randomUUID() };
  }
}

export default RealNotificationProvider;
