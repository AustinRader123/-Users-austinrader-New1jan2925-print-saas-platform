import prisma from '../lib/prisma.js';

export type PublishType = 'PRODUCT' | 'PRICING_RULE_SET' | 'ARTWORK_CATEGORY' | 'ARTWORK_ASSET' | 'THEME_TEMPLATE';

export class NetworkPublishService {
  private db() {
    return prisma as unknown as {
      product: {
        findFirst(args: unknown): Promise<unknown>;
      };
      pricingRuleSet: {
        findFirst(args: unknown): Promise<unknown>;
      };
      artworkCategory: {
        findFirst(args: unknown): Promise<unknown>;
      };
      artworkAsset: {
        findFirst(args: unknown): Promise<unknown>;
      };
      themeConfig: {
        findFirst(args: unknown): Promise<unknown>;
      };
      network: {
        findFirst(args: unknown): Promise<unknown>;
      };
      sharedCatalogItem: {
        findFirst(args: unknown): Promise<any>;
        update(args: unknown): Promise<unknown>;
        create(args: unknown): Promise<unknown>;
        findMany(args: unknown): Promise<unknown>;
      };
    };
  }

  private async assertSourceOwnership(input: { type: PublishType; sourceId: string; tenantId: string }) {
    if (input.type === 'PRODUCT') {
      const row = await this.db().product.findFirst({ where: { id: input.sourceId, store: { tenantId: input.tenantId } } });
      if (!row) throw new Error('Product source not found for tenant');
      return;
    }
    if (input.type === 'PRICING_RULE_SET') {
      const row = await this.db().pricingRuleSet.findFirst({ where: { id: input.sourceId, store: { tenantId: input.tenantId } } });
      if (!row) throw new Error('Pricing rule set source not found for tenant');
      return;
    }
    if (input.type === 'ARTWORK_CATEGORY') {
      const row = await this.db().artworkCategory.findFirst({ where: { id: input.sourceId, store: { tenantId: input.tenantId } } });
      if (!row) throw new Error('Artwork category source not found for tenant');
      return;
    }
    if (input.type === 'ARTWORK_ASSET') {
      const row = await this.db().artworkAsset.findFirst({ where: { id: input.sourceId, store: { tenantId: input.tenantId } } });
      if (!row) throw new Error('Artwork asset source not found for tenant');
      return;
    }
    if (input.type === 'THEME_TEMPLATE') {
      const row = await this.db().themeConfig.findFirst({ where: { id: input.sourceId, store: { tenantId: input.tenantId } } });
      if (!row) throw new Error('Theme template source not found for tenant');
      return;
    }
  }

  async publish(input: { tenantId: string; networkId: string; type: PublishType; sourceId: string }) {
    const network = await this.db().network.findFirst({ where: { id: input.networkId, tenantId: input.tenantId, enabled: true } });
    if (!network) throw new Error('Network not found or disabled for tenant');

    await this.assertSourceOwnership({ type: input.type, sourceId: input.sourceId, tenantId: input.tenantId });

    const existing = await this.db().sharedCatalogItem.findFirst({
      where: {
        networkId: input.networkId,
        type: input.type,
        sourceId: input.sourceId,
      },
    });

    if (existing) {
      return this.db().sharedCatalogItem.update({
        where: { id: existing.id },
        data: {
          version: Number(existing.version || 0) + 1,
          publishedAt: new Date(),
        },
      });
    }

    return this.db().sharedCatalogItem.create({
      data: {
        networkId: input.networkId,
        type: input.type,
        sourceId: input.sourceId,
        version: 1,
        publishedAt: new Date(),
      },
    });
  }

  async listSharedItems(tenantId: string, networkId: string, type?: PublishType) {
    const network = await this.db().network.findFirst({ where: { id: networkId, tenantId } });
    if (!network) throw new Error('Network not found for tenant');
    return this.db().sharedCatalogItem.findMany({
      where: {
        networkId,
        ...(type ? { type } : {}),
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publishProduct(tenantId: string, networkId: string, productId: string) {
    return this.publish({ tenantId, networkId, type: 'PRODUCT', sourceId: productId });
  }

  async publishPricingRuleSet(tenantId: string, networkId: string, ruleSetId: string) {
    return this.publish({ tenantId, networkId, type: 'PRICING_RULE_SET', sourceId: ruleSetId });
  }

  async publishArtworkCategory(tenantId: string, networkId: string, categoryId: string) {
    return this.publish({ tenantId, networkId, type: 'ARTWORK_CATEGORY', sourceId: categoryId });
  }

  async publishArtworkAsset(tenantId: string, networkId: string, assetId: string) {
    return this.publish({ tenantId, networkId, type: 'ARTWORK_ASSET', sourceId: assetId });
  }
}

export default new NetworkPublishService();
