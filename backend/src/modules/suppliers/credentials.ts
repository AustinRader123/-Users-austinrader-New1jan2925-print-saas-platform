export function encryptSupplierCredentials(value: unknown): string {
  const payload = JSON.stringify(value ?? {});
  return Buffer.from(payload, 'utf8').toString('base64');
}

export function decryptSupplierCredentials(payload: string | null | undefined): Record<string, any> {
  if (!payload) return {};
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}
