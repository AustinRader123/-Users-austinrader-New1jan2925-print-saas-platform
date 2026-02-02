import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import CartService from '../services/CartService.js';
import CheckoutService from '../services/CheckoutService.js';
import OrderService from '../services/OrderService.js';

const prisma = new PrismaClient();

describe('Slice 2 Integration: cart → checkout → paid → order → production job', () => {
  let user: any;
  let store: any;
  let product: any;
  let variant: any;
  let cart: any;

  beforeAll(async () => {
    store = await prisma.store.findFirst({});
    if (!store) throw new Error('Seed store not found');

    user = await prisma.user.findFirst({});
    if (!user) throw new Error('Seed user not found');

    product = await prisma.product.findFirst({ where: { storeId: store.id }, include: { variants: true } });
    if (!product) throw new Error('Seed product not found');
    variant = product.variants?.[0];
    if (!variant) throw new Error('Seed product variant not found');

    const c = await CartService.getOrCreateCart(user.id, undefined);
    cart = c;
    await CartService.addItem(c.id, product.id, variant.id, 1, undefined, undefined);
  });

  it('checks out and creates order + production job (mock payment)', async () => {
    const shipping = { name: 'Test User', email: user.email, address: { line1: '123 Main', city: 'Nowhere', state: 'CA', postalCode: '90001', country: 'US' } };
    const start = await CheckoutService.startCheckout({ storeId: store.id, userId: user.id, cartId: cart.id, shipping });
    expect(start).toHaveProperty('intentId');

    const confirm = await CheckoutService.handleMockConfirmation(start.intentId);
    expect(confirm.status).toBe('ok');
    expect(confirm).toHaveProperty('orderId');

    const order = await OrderService.getOrder(confirm.orderId);
    expect(order?.items?.length).toBeGreaterThan(0);
    expect(order?.paymentStatus).toBe('PAID');

    const job = await prisma.productionJob.findFirst({ where: { orderId: order!.id } });
    expect(job).toBeTruthy();
  });
});
