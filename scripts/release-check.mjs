import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function loadBackendEnvIfPresent() {
  const envPath = path.join(root, 'backend', '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!key || process.env[key] != null) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadBackendEnvIfPresent();
if (!process.env.DOCTOR_ALLOW_LOCALHOST_DB) {
  process.env.DOCTOR_ALLOW_LOCALHOST_DB = '1';
}

const steps = [
  { name: 'stop', command: 'npm', args: ['run', 'stop'] },
  { name: 'clean', command: 'npm', args: ['run', 'clean'] },
  { name: 'backend build', command: 'npm', args: ['run', 'build'], cwd: 'backend' },
  { name: 'frontend build', command: 'npm', args: ['run', 'build'], cwd: 'frontend' },
  { name: 'smoke:phase2c', command: 'npm', args: ['run', 'smoke:phase2c'], cwd: 'backend' },
  { name: 'smoke:phase3_1', command: 'npm', args: ['run', 'smoke:phase3_1'], cwd: 'backend' },
  { name: 'smoke:phase4', command: 'npm', args: ['run', 'smoke:phase4'], cwd: 'backend' },
  { name: 'smoke:phase5', command: 'npm', args: ['run', 'smoke:phase5'], cwd: 'backend' },
  { name: 'smoke:phase13', command: 'npm', args: ['run', 'smoke:phase13'], cwd: 'backend' },
  { name: 'smoke:phase14', command: 'npm', args: ['run', 'smoke:phase14'], cwd: 'backend' },
  { name: 'smoke:phase15', command: 'npm', args: ['run', 'smoke:phase15'], cwd: 'backend' },
  { name: 'smoke:phase16', command: 'npm', args: ['run', 'smoke:phase16'], cwd: 'backend' },
  { name: 'smoke:phase17', command: 'npm', args: ['run', 'smoke:phase17'], cwd: 'backend' },
  {
    name: 'smoke:sidebar-nav',
    command: 'npm',
    args: ['run', 'smoke:sidebar-nav'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:orders',
    command: 'npm',
    args: ['run', 'smoke:orders'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:products',
    command: 'npm',
    args: ['run', 'smoke:products'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:quotes',
    command: 'npm',
    args: ['run', 'smoke:quotes'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:production',
    command: 'npm',
    args: ['run', 'smoke:production'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:inventory',
    command: 'npm',
    args: ['run', 'smoke:inventory'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:purchasing',
    command: 'npm',
    args: ['run', 'smoke:purchasing'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:shipping',
    command: 'npm',
    args: ['run', 'smoke:shipping'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:billing',
    command: 'npm',
    args: ['run', 'smoke:billing'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:portal',
    command: 'npm',
    args: ['run', 'smoke:portal'],
    cwd: 'frontend',
    env: {
      PLAYWRIGHT_BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'https://skuflow.ai',
      SMOKE_EMAIL: process.env.SMOKE_EMAIL,
      SMOKE_PASSWORD: process.env.SMOKE_PASSWORD,
    },
  },
  {
    name: 'smoke:prod_sim',
    command: 'npm',
    args: ['run', 'smoke:prod_sim'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL,
      DOCTOR_ALLOW_LOCALHOST_DB: process.env.DOCTOR_ALLOW_LOCALHOST_DB,
    },
  },
  { name: 'smoke:phase6', command: 'npm', args: ['run', 'smoke:phase6'] },
];

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd ? path.join(root, step.cwd) : root,
      env: {
        ...process.env,
        ...(step.env || {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => resolve({ name: step.name, code: 1, output: `${output}\n${error.message}` }));
    child.on('exit', (code) => resolve({ name: step.name, code: code ?? 1, output }));
  });
}

async function main() {
  const results = [];
  const skipped = [];

  for (const step of steps) {
    console.log(`\n[release-check] running ${step.name}`);
    const result = await runStep(step);
    const isSkip = step.name === 'smoke:phase6' && /SKIP smoke:phase6:/i.test(result.output);

    if (isSkip) {
      skipped.push(step.name);
      results.push({ ...result, status: 'SKIPPED' });
      continue;
    }

    if (result.code !== 0) {
      results.push({ ...result, status: 'FAILED' });
      console.error(`\n[release-check] FAIL ${step.name}`);
      console.error('[release-check] matrix summary');
      for (const row of results) {
        console.error(`- ${row.name}: ${row.status}`);
      }
      if (skipped.length) {
        console.error(`[release-check] skipped: ${skipped.join(', ')}`);
      }
      process.exit(1);
    }

    results.push({ ...result, status: 'PASSED' });
  }

  console.log('\n[release-check] PASS matrix');
  for (const row of results) {
    console.log(`- ${row.name}: ${row.status}`);
  }
  if (skipped.length) {
    console.log(`[release-check] skipped: ${skipped.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(`[release-check] FAIL: ${error.message}`);
  process.exit(1);
});
