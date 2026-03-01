export type SendEmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type SendSmsInput = {
  to: string;
  body: string;
};

export interface NotificationProvider {
  sendEmail(input: SendEmailInput): Promise<{ accepted: boolean; provider: string; messageId: string }>;
  sendSms(input: SendSmsInput): Promise<{ accepted: boolean; provider: string; messageId: string }>;
}
