import { spawn } from 'node:child_process';

function run(cmd, args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ ok: false, code: -1, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs}ms` });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, stdout, stderr: error.message });
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code: code ?? -1, stdout, stderr });
    });
  });
}

async function main() {
  const dockerVersion = await run('docker', ['--version']);
  if (!dockerVersion.ok) {
    console.log('Docker unavailable: docker command not found or not executable');
    process.exit(1);
  }

  const dockerInfo = await run('docker', ['info'], 15000);
  if (!dockerInfo.ok) {
    const reason = (dockerInfo.stderr || dockerInfo.stdout || 'docker daemon is not accessible').trim();
    console.log(`Docker unavailable: ${reason}`);
    process.exit(1);
  }

  const composeV2 = await run('docker', ['compose', 'version']);
  if (composeV2.ok) {
    console.log('Docker available: docker + daemon + docker compose');
    process.exit(0);
  }

  const composeV1 = await run('docker-compose', ['--version']);
  if (composeV1.ok) {
    console.log('Docker available: docker + daemon + docker-compose');
    process.exit(0);
  }

  console.log('Docker unavailable: neither docker compose nor docker-compose is available');
  process.exit(1);
}

main().catch((error) => {
  console.log(`Docker unavailable: ${error.message}`);
  process.exit(1);
});
