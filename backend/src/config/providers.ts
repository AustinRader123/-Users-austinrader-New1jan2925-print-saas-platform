export type ProviderMode = 'mock' | 'real';

function parseMode(value: string | undefined, fallback: ProviderMode): ProviderMode {
  const normalized = String(value || fallback).toLowerCase();
  return normalized === 'real' ? 'real' : 'mock';
}

export const providerMode = {
  notifications: parseMode(process.env.NOTIFICATIONS_PROVIDER, 'mock'),
  webhooks: parseMode(process.env.WEBHOOKS_PROVIDER, 'mock'),
  payments: parseMode(process.env.PAYMENTS_PROVIDER, 'mock'),
  shipping: parseMode(process.env.SHIPPING_PROVIDER, 'mock'),
  tax: parseMode(process.env.TAX_PROVIDER, 'mock'),
};

export function envRequired(name: string): string {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name}`);
  }
  return String(value).trim();
}

export function isProd(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}
