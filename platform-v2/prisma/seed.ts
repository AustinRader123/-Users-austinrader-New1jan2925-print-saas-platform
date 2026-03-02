import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: { name: 'Demo Tenant' },
    create: { slug: 'demo', name: 'Demo Tenant' },
  });

  const store = await prisma.store.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'default' } },
    update: { name: 'Default Store' },
    create: { tenantId: tenant.id, slug: 'default', name: 'Default Store' },
  });

  await prisma.plan.upsert({
    where: { code: 'PRO' },
    update: { name: 'Pro', monthlyPrice: 199, limits: { users: 25, stores: 10 } },
    create: { code: 'PRO', name: 'Pro', monthlyPrice: 199, limits: { users: 25, stores: 10 } },
  });

  console.log({ tenantId: tenant.id, storeId: store.id });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
