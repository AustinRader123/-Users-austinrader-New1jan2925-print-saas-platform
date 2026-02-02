import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const stores = await prisma.store.findMany();
  console.log('Stores:', stores);
  
  const products = await prisma.product.findMany();
  console.log('All products:', products);
  
  const defaultProducts = await prisma.product.findMany({
    where: { storeId: 'default', status: 'ACTIVE' }
  });
  console.log('Default store active products:', defaultProducts);
}

test().catch(console.error).finally(() => prisma.$disconnect());
