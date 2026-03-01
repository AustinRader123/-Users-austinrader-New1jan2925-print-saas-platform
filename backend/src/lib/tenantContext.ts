import { AsyncLocalStorage } from 'async_hooks';

type StoreShape = { tenantId?: string } | undefined;

const als = new AsyncLocalStorage<StoreShape>();

export function runWithTenant<T>(tenantId: string | undefined, fn: () => T): T {
  return als.run({ tenantId }, fn as any);
}

export function getTenantId(): string | undefined {
  return als.getStore()?.tenantId;
}

export default als;
