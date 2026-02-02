import fs from 'node:fs';
import path from 'node:path';
import { Page } from '@playwright/test';

export async function loginViaUi(page: Page) {
  const thisDir = path.dirname(new URL(import.meta.url).pathname);
  const authPath = path.join(thisDir, '..', '.auth', 'admin.json');
  const raw = fs.readFileSync(authPath, 'utf-8');
  const state = JSON.parse(raw);
  const origin = state.origins?.[0];
  const token = origin?.localStorage?.find((e: any) => e.name === 'token')?.value;
  if (!token) throw new Error('No token in storage state');
  await page.addInitScript((tk) => {
    window.localStorage.setItem('token', tk);
  }, token);
}
