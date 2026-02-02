import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user (customer)
  const hashedPassword = await bcryptjs.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: hashedPassword,
      name: 'Test Customer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Created user: ${user.email}`);

  // Create admin user
  const adminPasswordHash = await bcryptjs.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@local.test' },
    update: {
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    create: {
      email: 'admin@local.test',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✓ Created admin: ${admin.email}`);

  // Create default store
  const store = await prisma.store.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Store',
      slug: 'default',
      status: 'ACTIVE',
      type: 'RETAIL',
    },
  });
  console.log(`✓ Created store: ${store.name}`);

  // Create test product (T-Shirt)
  const product = await prisma.product.upsert({
    where: { storeId_slug: { storeId: store.id, slug: 'classic-tshirt' } },
    update: {},
    create: {
      storeId: store.id,
      name: 'Classic T-Shirt',
      slug: 'classic-tshirt',
      description: 'Premium cotton t-shirt for custom designs',
      basePrice: 12.99,
      status: 'ACTIVE',
      type: 'CUSTOM',
      images: {
        create: [
          {
            url: 'https://via.placeholder.com/300x300?text=T-Shirt+Front',
            altText: 'T-Shirt Front',
            position: 0,
          },
        ],
      },
    },
  });
  console.log(`✓ Created product: ${product.name}`);

  // Create product variants (sizes and colors)
  const variants = [];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const colors = ['Black', 'White', 'Navy', 'Red'];

  for (const size of sizes) {
    for (const color of colors) {
      const sku = `TSHIRT-${color.toUpperCase()}-${size}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          name: `${color} - ${size}`,
          sku,
          size,
          color,
          supplierCost: 5.0,
          inventoryCount: 100,
        },
      });
      variants.push(variant);
    }
  }
  console.log(`✓ Created ${variants.length} product variants`);

  // Create decoration area (front chest print area)
  const decorationArea = await prisma.decorationArea.create({
    data: {
      productId: product.id,
      name: 'Front Chest',
      printMethod: 'SCREEN_PRINT',
      maxWidth: 8,
      maxHeight: 10,
      offsetX: 2,
      offsetY: 3,
      costPerSquareIn: 1.5,
      maxColorCount: 6,
    },
  });
  console.log(`✓ Created decoration area: ${decorationArea.name}`);

  // Create mockup template for product
  const templateFile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const template = await prisma.mockupTemplate.upsert({
    where: { productId: product.id },
    update: {},
    create: {
      productId: product.id,
      baseImageUrl: '/uploads/templates/template_' + product.id + '.png',
      maskUrl: null,
    },
  });
  console.log(`✓ Created mockup template for product`);

  // Create pricing rule
  const pricingRule = await prisma.pricingRule.create({
    data: {
      productId: product.id,
      name: 'Standard Pricing',
      basePrice: 14.99,
      colorSurcharge: 0.5,
      perPlacementCost: 2.0,
      quantityBreaklist: [
        { qty: 1, price: 14.99 },
        { qty: 10, price: 13.99 },
        { qty: 25, price: 12.99 },
        { qty: 50, price: 11.99 },
      ],
      active: true,
    },
  });
  console.log(`✓ Created pricing rule`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
