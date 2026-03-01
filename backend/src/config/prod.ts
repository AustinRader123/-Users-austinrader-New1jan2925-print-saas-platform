export const PROD = {
  requireDatabaseUrl: true,
  disallowLocalhostDb: true,
  requireWebhookSignatures: true,
  requirePaymentWebhookSig: true,
  requireShippingWebhookSig: true,
  strictCors: true,
  trustProxy: true,
  rateLimitPublic: { windowMs: 60_000, max: 60 },
  rateLimitAuth: { windowMs: 60_000, max: 20 },
} as const;

export function isProductionRuntime(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

export function shouldAllowLocalhostDbInProd(): boolean {
  return process.env.DOCTOR_ALLOW_LOCALHOST_DB === '1';
}

export function assertProdDatabaseUrlGuards(databaseUrl: string): void {
  if (!isProductionRuntime()) return;
  if (!databaseUrl || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (!PROD.disallowLocalhostDb || shouldAllowLocalhostDbInProd()) return;

  const normalized = databaseUrl.toLowerCase();
  if (normalized.includes('@localhost:') || normalized.includes('@127.0.0.1:') || normalized.includes('@::1:')) {
    throw new Error('In production, DATABASE_URL must not target localhost/127.0.0.1');
  }
}
