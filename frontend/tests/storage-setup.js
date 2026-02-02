#!/usr/bin/env node
// Simple storage state generator for Playwright
// Logs in via backend API and writes token to localStorage for the frontend origin

const fs = require('fs');
const path = require('path');

async function main() {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
  const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || 'http://localhost:3000';
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@local.test';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

  const loginUrl = `${BACKEND_BASE_URL}/api/auth/login`;

  const res = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Login failed: ${res.status} ${res.statusText} ${text}`);
  }

  const data = await res.json();
  const token = data?.token;
  if (!token) {
    throw new Error('No token returned from login');
  }

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          { name: 'token', value: token }
        ]
      }
    ]
  };

  const authDir = path.join(__dirname, '.auth');
  const outFile = path.join(authDir, 'admin.json');
  fs.mkdirSync(authDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(storageState, null, 2));
  console.log(`Wrote storage state to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
