import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import app from '../app.js';

const prisma = new PrismaClient();
let server: Server;
let baseUrl = '';
let storeSlug = '';

beforeAll(async () => {
  const seededStore = await prisma.store.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!seededStore?.slug) {
    throw new Error('Seeded store with slug is required for public cart auth regression test');
  }
  storeSlug = seededStore.slug;

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        throw new Error('Failed to resolve test server address');
      }
      baseUrl = `http://127.0.0.1:${(addr as AddressInfo).port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  await prisma.$disconnect();
});

describe('Public cart auth boundary', () => {
  it('allows cart create without auth and then fetch by token', async () => {
    const createResponse = await fetch(`${baseUrl}/api/public/cart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeSlug }),
    });

    expect(createResponse.status).not.toBe(401);
    expect([200, 201]).toContain(createResponse.status);

    const cart = await createResponse.json();
    expect(cart?.token).toBeTruthy();

    const getResponse = await fetch(`${baseUrl}/api/public/cart/${cart.token}`);
    expect(getResponse.status).not.toBe(401);
    expect(getResponse.status).toBe(200);

    const fetched = await getResponse.json();
    expect(fetched?.token).toBe(cart.token);
  });
});
