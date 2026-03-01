import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');

const backendPort = process.env.BACKEND_PORT || process.env.PORT || '3100';
const env = {
  ...process.env,
  BACKEND_PORT: backendPort,
  PORT: backendPort,
  BASE_URL: process.env.BASE_URL || `http://localhost:${backendPort}`,
};

const child = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
  cwd: backendDir,
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
