import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const steps = [
  { name: 'stop', command: 'npm', args: ['run', 'stop'] },
  { name: 'clean', command: 'npm', args: ['run', 'clean'] },
  { name: 'backend build', command: 'npm', args: ['run', 'build'], cwd: 'backend' },
  { name: 'frontend build', command: 'npm', args: ['run', 'build'], cwd: 'frontend' },
  { name: 'smoke:phase2c', command: 'npm', args: ['run', 'smoke:phase2c'], cwd: 'backend' },
  { name: 'smoke:phase3_1', command: 'npm', args: ['run', 'smoke:phase3_1'], cwd: 'backend' },
  { name: 'smoke:phase4', command: 'npm', args: ['run', 'smoke:phase4'], cwd: 'backend' },
  { name: 'smoke:phase5', command: 'npm', args: ['run', 'smoke:phase5'], cwd: 'backend' },
  { name: 'smoke:prod_sim', command: 'npm', args: ['run', 'smoke:prod_sim'] },
  { name: 'smoke:phase6', command: 'npm', args: ['run', 'smoke:phase6'] },
];

function runStep(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, {
      cwd: step.cwd ? path.join(root, step.cwd) : root,
      env: process.env,
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
