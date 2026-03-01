const version = (import.meta.env.VITE_APP_VERSION || 'dev').trim();
const commitRaw = (import.meta.env.VITE_GIT_SHA || 'unknown').trim();
const commit = commitRaw ? commitRaw.slice(0, 7) : 'unknown';
const env = (import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development').trim();

function normalizeIsoTime(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

const buildTime = normalizeIsoTime(import.meta.env.VITE_BUILD_TIME);

export const buildInfo = {
  version,
  commit,
  env,
  buildTime,
};
