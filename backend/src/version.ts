import fs from 'node:fs';

function readPackageVersion(): string {
  try {
    const packageJsonPath = new URL('../package.json', import.meta.url);
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    return String(parsed.version || '').trim();
  } catch {
    return '';
  }
}

function normalizeBuildTime(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

const packageVersion = readPackageVersion();
const resolvedVersion =
  (process.env.APP_VERSION || '').trim() ||
  (process.env.npm_package_version || '').trim() ||
  packageVersion ||
  '0.0.0';

const resolvedCommitRaw = (process.env.GIT_SHA || process.env.COMMIT_SHA || '').trim();
const resolvedCommit = resolvedCommitRaw ? resolvedCommitRaw.slice(0, 7) : 'unknown';

const resolvedEnv =
  (process.env.APP_ENV || '').trim() ||
  (process.env.NODE_ENV || '').trim() ||
  'development';

const resolvedBuildTime = normalizeBuildTime(process.env.BUILD_TIME);

export const appVersionMeta = {
  version: resolvedVersion,
  commit: resolvedCommit,
  buildTime: resolvedBuildTime,
  env: resolvedEnv,
};

export const appVersionHeader = `${appVersionMeta.version} (${appVersionMeta.commit})`;
