import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
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

    child.on('error', (error) => resolve({ code: 1, output: `${output}\n${error.message}` }));
    child.on('exit', (code) => resolve({ code: code ?? 1, output }));
  });
}

async function main() {
  const requireDocker = process.env.REQUIRE_DOCKER === '1';
  const hasDocker = await run('node', ['scripts/has-docker.mjs']);

  if (hasDocker.code !== 0) {
    const reason = hasDocker.output.trim().split('\n').filter(Boolean).at(-1) || 'Docker unavailable';
    if (requireDocker) {
      console.error(`FAIL smoke:phase6: Docker is required but unavailable (${reason})`);
      process.exit(1);
    }
    console.log(`SKIP smoke:phase6: Docker unavailable (${reason})`);
    process.exit(0);
  }

  const smoke = await run('bash', ['backend/scripts/smoke-phase6.sh']);
  process.exit(smoke.code);
}

main().catch((error) => {
  console.error(`FAIL smoke:phase6: ${error.message}`);
  process.exit(1);
});
