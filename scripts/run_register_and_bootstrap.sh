#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STORE_ID="${STORE_ID:-test-store}"
CONN_ID="${CONN_ID:-test-conn}"
MOCK_PORT="${MOCK_PORT:-6060}"
DN_USERNAME="${DN_USERNAME:-testuser}"
DN_PASSWORD="${DN_PASSWORD:-testpass}"

NODE_PATH="${NODE_PATH:-$ROOT/backend/node_modules}"
export NODE_PATH

node <<'NODE'
(async () => {
  const fs = require('fs');
  const path = require('path');
  const { PrismaClient } = require('@prisma/client');
  const qm = require(path.join(process.cwd(), 'backend/dist/services/QueueManager.js')).default;
  const cryptoModule = require(path.join(process.cwd(), 'backend/dist/shared/crypto/crypto.js'));
  const p = new PrismaClient();
  try {
    const STORE_ID = process.env.STORE_ID || 'test-store';
    const CONN_ID = process.env.CONN_ID || 'test-conn';
    const MOCK_PORT = process.env.MOCK_PORT || '6060';
    const DN_USERNAME = process.env.DN_USERNAME || 'testuser';
    const DN_PASSWORD = process.env.DN_PASSWORD || 'testpass';

    let encKey = process.env.DN_ENC_KEY;
    if (!encKey) {
      try {
        const env = fs.readFileSync(path.join(process.cwd(), 'backend/.env'), 'utf8');
        const m = env.match(/^DN_ENC_KEY="?(.+?)"?$/m);
        if (m) encKey = m[1];
      } catch (e) {
        // ignore
      }
    }
    if (!encKey) throw new Error('DN_ENC_KEY not set in env or backend/.env');

    // upsert store by slug
    const store = await p.store.upsert({
      where: { slug: STORE_ID },
      update: { name: STORE_ID },
      create: { name: STORE_ID, slug: STORE_ID }
    });

    const encUser = cryptoModule.encryptString(DN_USERNAME, encKey);
    const encPass = cryptoModule.encryptString(DN_PASSWORD, encKey);
    const baseUrl = `http://localhost:${MOCK_PORT}`;

    await p.decoNetworkConnection.upsert({
      where: { id: CONN_ID },
      update: {
        storeId: store.id,
        name: 'mock-dn-connection',
        baseUrl,
        encryptedUsername: encUser,
        encryptedPassword: encPass,
        enabled: true
      },
      create: {
        id: CONN_ID,
        storeId: store.id,
        name: 'mock-dn-connection',
        baseUrl,
        encryptedUsername: encUser,
        encryptedPassword: encPass,
        enabled: true
      }
    });

    console.log('Connection upserted:', CONN_ID);
    // enqueue bootstrap job
    await qm.enqueueJob('dn:bootstrap', { connectionId: CONN_ID });
    console.log('Enqueued dn:bootstrap for', CONN_ID);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  } finally {
    try { await p.$disconnect(); } catch (e) {}
  }
})();
NODE
