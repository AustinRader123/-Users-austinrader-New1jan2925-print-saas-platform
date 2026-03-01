import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const command = process.argv[2];
if (!command || !['clean', 'stop', 'doctor'].includes(command)) {
  console.error('Usage: node scripts/run-platform.mjs <clean|stop|doctor>');
  process.exit(2);
}

const extraArgs = process.argv.slice(3);
const env = { ...process.env };
const passthroughArgs = [];
for (const arg of extraArgs) {
  if (command === 'doctor' && (arg === '--prod' || arg === '--production')) {
    env.DOCTOR_PROFILE = 'production';
    continue;
  }
  passthroughArgs.push(arg);
}

const isWin = process.platform === 'win32';
const scriptPath = path.join(root, 'scripts', `${command}.${isWin ? 'ps1' : 'sh'}`);
const child = isWin
  ? spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...passthroughArgs], {
      cwd: root,
      stdio: 'inherit',
      env,
    })
  : spawn('bash', [scriptPath, ...passthroughArgs], {
      cwd: root,
      stdio: 'inherit',
      env,
    });

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
