import dotenv from 'dotenv';

dotenv.config();

const LOCAL_DEV_DATABASE_URL = 'postgresql://user:password@localhost:5432/deco_network';

export const isStrictRuntime =
  process.env.CI === 'true' || process.env.REQUIRE_DOCKER === '1' || process.env.NODE_ENV === 'production';

export function get(name: string, defaultValue = ''): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') return value;
  return defaultValue;
}

export function mustGet(name: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') return value;
  throw new Error(`[env] Missing required ${name}. In CI/compose/production, set ${name} explicitly.`);
}

export const DATABASE_URL = isStrictRuntime ? mustGet('DATABASE_URL') : get('DATABASE_URL', LOCAL_DEV_DATABASE_URL);
