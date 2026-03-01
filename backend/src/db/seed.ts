import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encryptSupplierCredentials } from '../modules/suppliers/credentials.js';

const prisma = new PrismaClient();

type TenantCapabilityClient = {
  tenant: { upsert(args: unknown): Promise<{ id: string; slug: string }> };
  tenantUser: { upsert(args: unknown): Promise<{ id: string }> };
  role: { upsert(args: unknown): Promise<{ id: string; name: string }> };
  permission: { upsert(args: unknown): Promise<{ id: string }> };
  rolePermission: { upsert(args: unknown): Promise<unknown> };
  tenantUserRole: { upsert(args: unknown): Promise<unknown> };
};

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) as "exists"
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for db:seed');
  }

  const tenantSlug = process.env.SEED_TENANT_SLUG || process.env.SEED_STORE_SLUG || 'demo-tenant';
  const tenantName = process.env.SEED_TENANT_NAME || process.env.SEED_STORE_NAME || 'Demo Tenant';
  const storeSlug = process.env.SEED_STORE_SLUG || 'default';
  const storeName = process.env.SEED_STORE_NAME || 'Default Store';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@demo.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'AdminPass123!';

  console.log('Seeding tenant/admin records (idempotent, non-interactive)');

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: 'Demo Admin', passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: { email: adminEmail, passwordHash, name: 'Demo Admin', role: 'ADMIN', status: 'ACTIVE' },
  });

  const hasTenant = await tableExists('Tenant');
  const hasTenantUser = await tableExists('TenantUser');
  const hasRole = await tableExists('Role');
  const hasPermission = await tableExists('Permission');
  const hasRolePermission = await tableExists('RolePermission');
  const hasTenantUserRole = await tableExists('TenantUserRole');
  const hasStore = await tableExists('Store');
  const hasProduct = await tableExists('Product');
  const hasProductVariant = await tableExists('ProductVariant');
  const hasProductImage = await tableExists('ProductImage');
  const hasPricingRuleSet = await tableExists('PricingRuleSet');
  const hasPricingRule = await tableExists('PricingRule');
  const hasSupplierConnection = await tableExists('SupplierConnection');
  const hasPlan = await tableExists('Plan');
  const hasTenantSubscription = await tableExists('TenantSubscription');
  const hasBillingEvent = await tableExists('BillingEvent');
  const hasInvoice = await tableExists('BillingInvoice');

  let seededStore: { id: string; slug: string; name: string } | null = null;
  let seededTenant: { id: string; slug: string } | null = null;

  if (hasTenant && hasTenantUser && hasRole && hasPermission && hasRolePermission && hasTenantUserRole) {
    const tenancyClient = prisma as unknown as TenantCapabilityClient;

    const tenant = await tenancyClient.tenant.upsert({
      where: { slug: tenantSlug },
      update: { name: tenantName },
      create: { name: tenantName, slug: tenantSlug },
    });
    seededTenant = { id: tenant.id, slug: tenant.slug };

    const tenantUser = await tenancyClient.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {},
      create: { tenantId: tenant.id, userId: user.id },
    });

    const role = await tenancyClient.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: 'admin' } },
      update: {},
      create: { tenantId: tenant.id, name: 'admin', description: 'Administrator role with full permissions' },
    });

    const perms = [
      'tenant:manage',
      'users:manage',
      'products:manage',
      'orders:manage',
      'catalog.manage',
      'customizer.manage',
      'pricing.manage',
      'quotes.manage',
      'production.manage',
      'production.view',
      'production.scan',
      'suppliers.manage',
      'webhooks.manage',
      'billing.manage',
      'billing.view',
      'shipping.manage',
      'shipping.view',
      'portal.view',
      'domains.manage',
      'onboarding.manage',
      'storefront.theme.manage',
      'comms.manage',
      'documents.view',
      'reports.view',
      'network.manage',
      'network.publish',
      'network.route',
      'network.reports.view',
      'fundraising.manage',
      'fundraising.reports.view',
    ];
    for (const permissionName of perms) {
      const permission = await tenancyClient.permission.upsert({
        where: { name: permissionName },
        update: {},
        create: { name: permissionName, description: `${permissionName} permission` },
      });

      await tenancyClient.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    await tenancyClient.tenantUserRole.upsert({
      where: { tenantUserId_roleId: { tenantUserId: tenantUser.id, roleId: role.id } },
      update: {},
      create: { tenantUserId: tenantUser.id, roleId: role.id },
    });

    console.log('Seed complete:');
    console.log('  tenant:', { id: tenant.id, slug: tenant.slug, mode: 'tenancy' });
    console.log('  adminUser:', { id: user.id, email: user.email });
    console.log('  linkedTenantUser:', { id: tenantUser.id });
    console.log('  adminRole:', { id: role.id, name: role.name });

    if (hasPlan) {
      const plans = [
        {
          code: 'FREE',
          name: 'Free',
          priceCents: null,
          interval: 'MONTH',
          features: {
            'suppliers.enabled': false,
            'teamStores.enabled': false,
            'advancedPricing.enabled': false,
            'webhooks.enabled': false,
            'customizer.enabled': false,
            'network.enabled': false,
            'fundraising.enabled': false,
            'production_v2.enabled': false,
            'inventory.enabled': false,
            'portal.enabled': false,
            'billing.enabled': false,
            'shipping.enabled': false,
          },
          limits: { maxStores: 1, maxUsers: 2, maxMonthlyOrders: 50 },
        },
        {
          code: 'STARTER',
          name: 'Starter',
          priceCents: 4900,
          interval: 'MONTH',
          features: {
            'suppliers.enabled': true,
            'teamStores.enabled': true,
            'advancedPricing.enabled': false,
            'webhooks.enabled': false,
            'customizer.enabled': false,
            'network.enabled': false,
            'fundraising.enabled': false,
            'production_v2.enabled': false,
            'inventory.enabled': false,
            'portal.enabled': false,
            'billing.enabled': false,
            'shipping.enabled': false,
          },
          limits: { maxStores: 2, maxUsers: 5, maxMonthlyOrders: 500 },
        },
        {
          code: 'PRO',
          name: 'Pro',
          priceCents: 12900,
          interval: 'MONTH',
          features: {
            'suppliers.enabled': true,
            'teamStores.enabled': true,
            'advancedPricing.enabled': true,
            'webhooks.enabled': true,
            'customizer.enabled': true,
            'network.enabled': true,
            'fundraising.enabled': true,
            'production_v2.enabled': false,
            'inventory.enabled': false,
            'portal.enabled': false,
            'billing.enabled': false,
            'shipping.enabled': false,
          },
          limits: { maxStores: 10, maxUsers: 50, maxMonthlyOrders: 5000 },
        },
        {
          code: 'ENTERPRISE',
          name: 'Enterprise',
          priceCents: null,
          interval: 'MONTH',
          features: {
            'suppliers.enabled': true,
            'teamStores.enabled': true,
            'advancedPricing.enabled': true,
            'webhooks.enabled': true,
            'customizer.enabled': true,
            'network.enabled': true,
            'fundraising.enabled': true,
            'production_v2.enabled': false,
            'inventory.enabled': false,
            'portal.enabled': false,
            'billing.enabled': false,
            'shipping.enabled': false,
          },
          limits: { maxStores: 9999, maxUsers: 9999, maxMonthlyOrders: 999999 },
        },
      ] as const;

      for (const plan of plans) {
        await (prisma as any).plan.upsert({
          where: { code: plan.code },
          update: {
            name: plan.name,
            priceCents: plan.priceCents,
            interval: plan.interval,
            features: plan.features,
            limits: plan.limits,
            active: true,
          },
          create: {
            code: plan.code,
            name: plan.name,
            priceCents: plan.priceCents,
            interval: plan.interval,
            features: plan.features,
            limits: plan.limits,
            active: true,
          },
        });
      }
      console.log('  plans:', plans.map((p) => p.code));
    }

    if (hasTenantSubscription && seededTenant) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const existingSub = await (prisma as any).tenantSubscription.findFirst({
        where: { tenantId: seededTenant.id },
        orderBy: { createdAt: 'desc' },
      });
      if (!existingSub) {
        await (prisma as any).tenantSubscription.create({
          data: {
            tenantId: seededTenant.id,
            planCode: 'PRO',
            status: 'ACTIVE',
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
            provider: 'MOCK',
          },
        });
      }
      console.log('  tenantSubscription:', { tenantId: seededTenant.id, defaultPlan: 'PRO' });
    }

    if (seededTenant && hasBillingEvent) {
      const existing = await (prisma as any).billingEvent.findFirst({ where: { tenantId: seededTenant.id, type: 'seed.billing_initialized' } });
      if (!existing) {
        await (prisma as any).billingEvent.create({
          data: {
            tenantId: seededTenant.id,
            type: 'seed.billing_initialized',
            payload: { provider: 'MOCK' },
          },
        });
      }
    }

    if (seededTenant && hasInvoice) {
      const existingInvoice = await (prisma as any).billingInvoice.findFirst({
        where: { tenantId: seededTenant.id, number: 'INV-SEED-0001' },
      });
      if (!existingInvoice) {
        await (prisma as any).billingInvoice.create({
          data: {
            tenantId: seededTenant.id,
            number: 'INV-SEED-0001',
            status: 'PAID',
            amountCents: 12900,
            currency: 'USD',
            issuedAt: new Date(),
            paidAt: new Date(),
            providerRef: 'mock-seed',
          },
        });
      }
    }
  } else {
    console.log('Tenancy tables not present, continuing with legacy-compatible seed path.');
  }

  if (hasStore) {
    seededStore = await prisma.store.upsert({
      where: { slug: storeSlug },
      update: { name: storeName, ...(seededTenant ? { tenantId: seededTenant.id } : {}) },
      create: {
        name: storeName,
        slug: storeSlug,
        status: 'ACTIVE',
        type: 'RETAIL',
        ...(seededTenant ? { tenantId: seededTenant.id } : {}),
      },
    });
    console.log('  store:', { id: seededStore.id, slug: seededStore.slug, name: seededStore.name });
  }

  if (seededStore && hasSupplierConnection) {
    const existingMock = await prisma.supplierConnection.findFirst({
      where: { storeId: seededStore.id, supplier: 'MOCK' },
      select: { id: true },
    });

    const credentials = {
      mode: 'mock',
      note: 'Created by seed for smoke:phase3',
    };

    if (existingMock) {
      await prisma.supplierConnection.update({
        where: { id: existingMock.id },
        data: {
          name: 'Mock Supplier Feed',
          authType: 'MOCK',
          enabled: true,
          syncEnabled: false,
          syncIntervalMinutes: 1440,
          syncNextAt: null,
          credentialsEncrypted: encryptSupplierCredentials(credentials),
        },
      });
    } else {
      await prisma.supplierConnection.create({
        data: {
          storeId: seededStore.id,
          supplier: 'MOCK',
          name: 'Mock Supplier Feed',
          authType: 'MOCK',
          enabled: true,
          syncEnabled: false,
          syncIntervalMinutes: 1440,
          syncNextAt: null,
          credentialsEncrypted: encryptSupplierCredentials(credentials),
        },
      });
    }
    console.log('  supplierConnection:', { supplier: 'MOCK', mode: 'seeded' });
  }

  let starterRuleSet: { id: string; name: string } | null = null;
  if (seededStore && hasPricingRuleSet) {
    starterRuleSet = await prisma.pricingRuleSet.upsert({
      where: { storeId_name: { storeId: seededStore.id, name: 'Starter Rule Set' } },
      update: { active: true, isDefault: true },
      create: {
        storeId: seededStore.id,
        name: 'Starter Rule Set',
        description: 'Default starter pricing rules',
        isDefault: true,
        active: true,
        metadata: { source: 'seed' },
      },
    });
    console.log('  starterPricingRuleSet:', { id: starterRuleSet.id, name: starterRuleSet.name });
  }

  if (seededStore && hasProduct && hasProductVariant && hasProductImage) {
    const catalog = [
      {
        slug: 'starter-tee',
        name: 'Starter Tee',
        description: 'Classic cotton tee for decorated programs.',
        category: 'Apparel',
        basePrice: 19.99,
        variants: [
          { sku: 'ST-TEE-BLK-S', name: 'Black / S', color: 'Black', size: 'S', cost: 8.5, price: 19.99, inventoryQty: 120 },
          { sku: 'ST-TEE-BLK-M', name: 'Black / M', color: 'Black', size: 'M', cost: 8.5, price: 19.99, inventoryQty: 140 },
          { sku: 'ST-TEE-BLK-L', name: 'Black / L', color: 'Black', size: 'L', cost: 8.9, price: 20.99, inventoryQty: 130 },
          { sku: 'ST-TEE-NVY-M', name: 'Navy / M', color: 'Navy', size: 'M', cost: 8.7, price: 20.49, inventoryQty: 115 },
          { sku: 'ST-TEE-WHT-M', name: 'White / M', color: 'White', size: 'M', cost: 8.3, price: 19.49, inventoryQty: 150 },
        ],
        images: [
          { url: 'https://picsum.photos/seed/starter-tee-main/800/800', color: null, sortOrder: 1 },
          { url: 'https://picsum.photos/seed/starter-tee-black/800/800', color: 'Black', sortOrder: 2 },
          { url: 'https://picsum.photos/seed/starter-tee-navy/800/800', color: 'Navy', sortOrder: 3 },
        ],
      },
      {
        slug: 'performance-polo',
        name: 'Performance Polo',
        description: 'Moisture-wicking polo for corporate teams.',
        category: 'Polos',
        basePrice: 27.5,
        variants: [
          { sku: 'PF-POL-BLK-M', name: 'Black / M', color: 'Black', size: 'M', cost: 12.2, price: 27.5, inventoryQty: 90 },
          { sku: 'PF-POL-BLK-L', name: 'Black / L', color: 'Black', size: 'L', cost: 12.4, price: 27.99, inventoryQty: 84 },
          { sku: 'PF-POL-CHA-M', name: 'Charcoal / M', color: 'Charcoal', size: 'M', cost: 12.5, price: 28.5, inventoryQty: 72 },
          { sku: 'PF-POL-BLU-M', name: 'Blue / M', color: 'Blue', size: 'M', cost: 12.1, price: 27.5, inventoryQty: 95 },
          { sku: 'PF-POL-WHT-L', name: 'White / L', color: 'White', size: 'L', cost: 12.0, price: 27.25, inventoryQty: 78 },
        ],
        images: [
          { url: 'https://picsum.photos/seed/performance-polo-main/800/800', color: null, sortOrder: 1 },
          { url: 'https://picsum.photos/seed/performance-polo-black/800/800', color: 'Black', sortOrder: 2 },
          { url: 'https://picsum.photos/seed/performance-polo-blue/800/800', color: 'Blue', sortOrder: 3 },
          { url: 'https://picsum.photos/seed/performance-polo-white/800/800', color: 'White', sortOrder: 4 },
        ],
      },
    ];

    for (const item of catalog) {
      const product = await prisma.product.upsert({
        where: { storeId_slug: { storeId: seededStore.id, slug: item.slug } },
        update: {
          name: item.name,
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          tags: ['seed', 'phase2a', item.category.toLowerCase()],
          status: 'ACTIVE',
          active: true,
          type: 'CUSTOM',
        },
        create: {
          storeId: seededStore.id,
          externalId: `seed-${item.slug}`,
          name: item.name,
          slug: item.slug,
          description: item.description,
          category: item.category,
          tags: ['seed', 'phase2a', item.category.toLowerCase()],
          basePrice: item.basePrice,
          status: 'ACTIVE',
          active: true,
          type: 'CUSTOM',
        },
      });

      for (const variant of item.variants) {
        await prisma.productVariant.upsert({
          where: { sku: variant.sku },
          update: {
            productId: product.id,
            storeId: seededStore.id,
            name: variant.name,
            color: variant.color,
            size: variant.size,
            cost: variant.cost,
            price: variant.price,
            inventoryQty: variant.inventoryQty,
            supplierCost: variant.cost,
            inventoryCount: variant.inventoryQty,
            externalId: `seed-${variant.sku.toLowerCase()}`,
          },
          create: {
            productId: product.id,
            storeId: seededStore.id,
            name: variant.name,
            sku: variant.sku,
            color: variant.color,
            size: variant.size,
            cost: variant.cost,
            price: variant.price,
            inventoryQty: variant.inventoryQty,
            supplierCost: variant.cost,
            inventoryCount: variant.inventoryQty,
            externalId: `seed-${variant.sku.toLowerCase()}`,
          },
        });
      }

      for (const image of item.images) {
        const existingImage = await prisma.productImage.findFirst({
          where: { productId: product.id, url: image.url },
          select: { id: true },
        });
        const data = {
          storeId: seededStore.id,
          productId: product.id,
          url: image.url,
          path: image.url,
          color: image.color,
          sortOrder: image.sortOrder,
          altText: `${item.name}${image.color ? ` - ${image.color}` : ''}`,
          position: image.sortOrder,
        };
        if (existingImage) {
          await prisma.productImage.update({ where: { id: existingImage.id }, data });
        } else {
          await prisma.productImage.create({ data });
        }
      }
    }

    if (hasPricingRule && starterRuleSet) {
      const ruleSpecs = [
        {
          name: 'Default Quantity Breaks',
          method: 'QUANTITY_BREAK',
          priority: 10,
          conditions: {
            qtyBreaks: [
              { minQty: 1, multiplier: 1 },
              { minQty: 24, multiplier: 0.95 },
              { minQty: 72, multiplier: 0.9 },
            ],
          },
          effects: { type: 'multiplier' },
        },
        {
          name: 'Screen Print Decoration',
          method: 'DECORATION_PER_ITEM',
          priority: 20,
          conditions: { decorationMethod: 'SCREEN_PRINT' },
          effects: { perItem: 1.75, setupFee: 25 },
        },
        {
          name: 'Embroidery Decoration',
          method: 'DECORATION_PER_ITEM',
          priority: 20,
          conditions: { decorationMethod: 'EMBROIDERY' },
          effects: { perItem: 2.5, setupFee: 35 },
        },
      ];

      for (const spec of ruleSpecs) {
        const existingRule = await prisma.pricingRule.findFirst({
          where: {
            storeId: seededStore.id,
            ruleSetId: starterRuleSet.id,
            name: spec.name,
          },
          select: { id: true },
        });

        const firstProduct = await prisma.product.findFirst({
          where: { storeId: seededStore.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (!firstProduct) {
          throw new Error('Expected at least one product for starter pricing rules');
        }

        const ruleData = {
          storeId: seededStore.id,
          ruleSetId: starterRuleSet.id,
          productId: firstProduct.id,
          name: spec.name,
          method: spec.method,
          priority: spec.priority,
          conditions: spec.conditions,
          effects: spec.effects,
          printMethod: 'SCREEN_PRINT' as const,
          minQuantity: 1,
          basePrice: 0,
          colorSurcharge: 0,
          perPlacementCost: 0,
          quantityBreaklist: { breaks: [] },
          active: true,
        };

        if (existingRule) {
          await prisma.pricingRule.update({ where: { id: existingRule.id }, data: ruleData });
        } else {
          await prisma.pricingRule.create({ data: ruleData });
        }
      }
    }

    const [productsCount, variantsCount, imagesCount] = await Promise.all([
      prisma.product.count({ where: { storeId: seededStore.id } }),
      prisma.productVariant.count({ where: { storeId: seededStore.id } }),
      prisma.productImage.count({ where: { storeId: seededStore.id } }),
    ]);

    console.log('  catalogCounts:', {
      products: productsCount,
      variants: variantsCount,
      images: imagesCount,
    });
  }

  console.log('Seed complete:');
  console.log('  tenant:', { slug: tenantSlug, name: tenantName });
  console.log('  adminUser:', { id: user.id, email: user.email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
