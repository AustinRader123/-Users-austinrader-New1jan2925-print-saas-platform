import { PrismaClient } from '@prisma/client';
import PricingEngine from './PricingEngine.js';
import logger from '../logger.js';

const prisma = new PrismaClient();

export class CartService {
  async getOrCreateCart(userId?: string, sessionId?: string) {
    let cart = await prisma.cart.findFirst({
      where: {
        status: 'ACTIVE',
        ...(userId && { userId }),
        ...(!userId && sessionId && { sessionId }),
      },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          sessionId,
          status: 'ACTIVE',
        },
        include: { items: true },
      });
    }

    return cart;
  }

  async addItem(
    cartId: string,
    productId: string,
    variantId: string,
    quantity: number,
    designId?: string,
    mockupUrl?: string
  ) {
    // Get pricing snapshot
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { storeId: true } });
    const storeId = product?.storeId || 'default';
    const pricing = await PricingEngine.calculate({
      storeId,
      productVariantId: variantId,
      quantity,
    });

    const item = await prisma.cartItem.create({
      data: {
        cartId,
        productId,
        productVariantId: variantId,
        designId,
        quantity,
        mockupUrl,
      },
    });

    // Freeze pricing
    await prisma.pricingSnapshot.create({
      data: {
        cartItemId: item.id,
        basePrice: pricing.basePrice,
        colorSurcharge: pricing.colorSurcharge,
        quantityDiscount: pricing.quantityDiscount,
        totalPrice: pricing.total,
        breakdown: pricing.breakdown,
      },
    });

    // Update cart total
    await this.updateCartTotal(cartId);

    return item;
  }

  async updateCartItemQuantity(itemId: string, quantity: number) {
    const item = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { cart: true },
    });

    await this.updateCartTotal(item.cartId);
    return item;
  }

  async removeItem(itemId: string) {
    const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Cart item not found');

    await prisma.cartItem.delete({ where: { id: itemId } });
    await this.updateCartTotal(item.cartId);
  }

  async getCartDetails(cartId: string) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: { include: { images: { take: 1 } } },
            productVariant: true,
            design: true,
            pricingSnapshot: true,
          },
        },
      },
    });
  }

  async updateCartTotal(cartId: string) {
    const items = await prisma.cartItem.findMany({
      where: { cartId },
      include: { pricingSnapshot: true },
    });

    const total = items.reduce((sum, item) => {
      return sum + (item.pricingSnapshot?.totalPrice || 0);
    }, 0);

    await prisma.cart.update({
      where: { id: cartId },
      data: { total },
    });
  }

  async abandonCart(cartId: string) {
    return prisma.cart.update({
      where: { id: cartId },
      data: { status: 'ABANDONED' },
    });
  }
}

export default new CartService();
