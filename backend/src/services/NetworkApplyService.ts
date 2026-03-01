import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';

function ensureObject(value: any): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  return {};
}

export class NetworkApplyService {
  private async ensureBinding(storeId: string, sharedCatalogItemId: string) {
    const existing = await (prisma as any).storeCatalogBinding.findFirst({ where: { storeId, sharedCatalogItemId } });
    if (existing) return existing;
    return (prisma as any).storeCatalogBinding.create({
      data: {
        storeId,
        sharedCatalogItemId,
        status: 'APPLIED',
        appliedVersion: 0,
      },
    });
  }

  private async applyProduct(sharedItem: any, storeId: string, binding: any) {
    const sourceProduct = await prisma.product.findUnique({
      where: { id: sharedItem.sourceId },
      include: { variants: true, images: true },
    });
    if (!sourceProduct) throw new Error('Source product not found');

    const bindingMeta = ensureObject(binding.overrideData);
    const existingCloneId = bindingMeta.cloneProductId ? String(bindingMeta.cloneProductId) : null;

    const nextSlugBase = `${sourceProduct.slug}-net-${sharedItem.networkId.slice(0, 6)}`;
    const nextSlug = `${nextSlugBase}-${storeId.slice(0, 6)}`;

    const cloneProduct = existingCloneId
      ? await prisma.product.update({
          where: { id: existingCloneId },
          data: {
            name: sourceProduct.name,
            description: sourceProduct.description,
            category: sourceProduct.category,
            tags: sourceProduct.tags,
            active: sourceProduct.active,
            basePrice: sourceProduct.basePrice,
            status: sourceProduct.status,
            type: sourceProduct.type,
          },
        })
      : await prisma.product.create({
          data: {
            storeId,
            name: sourceProduct.name,
            slug: nextSlug,
            description: sourceProduct.description,
            category: sourceProduct.category,
            tags: sourceProduct.tags,
            active: sourceProduct.active,
            basePrice: sourceProduct.basePrice,
            status: sourceProduct.status,
            type: sourceProduct.type,
          },
        });

    const variantMap = ensureObject(bindingMeta.variantMap);

    for (const sourceVariant of sourceProduct.variants) {
      const cloneVariantId = variantMap[sourceVariant.id] ? String(variantMap[sourceVariant.id]) : null;
      const cloneVariant = cloneVariantId
        ? await prisma.productVariant.update({
            where: { id: cloneVariantId },
            data: {
              name: sourceVariant.name,
              size: sourceVariant.size,
              color: sourceVariant.color,
              cost: sourceVariant.cost,
              price: sourceVariant.price,
              inventoryQty: sourceVariant.inventoryQty,
              supplierCost: sourceVariant.supplierCost,
              inventoryCount: sourceVariant.inventoryCount,
            },
          })
        : await prisma.productVariant.create({
            data: {
              storeId,
              productId: cloneProduct.id,
              name: sourceVariant.name,
              sku: `${sourceVariant.sku}-NET-${storeId.slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
              size: sourceVariant.size,
              color: sourceVariant.color,
              cost: sourceVariant.cost,
              price: sourceVariant.price,
              inventoryQty: sourceVariant.inventoryQty,
              supplierCost: sourceVariant.supplierCost,
              inventoryCount: sourceVariant.inventoryCount,
            },
          });

      variantMap[sourceVariant.id] = cloneVariant.id;
    }

    const existingImages = await prisma.productImage.findMany({ where: { storeId, productId: cloneProduct.id } });
    if (existingImages.length) {
      await prisma.productImage.deleteMany({ where: { id: { in: existingImages.map((row) => row.id) } } });
    }

    for (const image of sourceProduct.images) {
      await prisma.productImage.create({
        data: {
          storeId,
          productId: cloneProduct.id,
          url: image.url,
          path: image.path,
          color: image.color,
          sortOrder: image.sortOrder,
          altText: image.altText,
          position: image.position,
        },
      });
    }

    return {
      ...bindingMeta,
      cloneProductId: cloneProduct.id,
      variantMap,
      sourceProductId: sourceProduct.id,
      sourceVersion: sharedItem.version,
      lastAppliedAt: new Date().toISOString(),
    };
  }

  private async applyPricingRuleSet(sharedItem: any, storeId: string, binding: any) {
    const source = await prisma.pricingRuleSet.findUnique({ where: { id: sharedItem.sourceId }, include: { rules: true } });
    if (!source) throw new Error('Source pricing rule set not found');

    const bindingMeta = ensureObject(binding.overrideData);
    const existingCloneId = bindingMeta.cloneRuleSetId ? String(bindingMeta.cloneRuleSetId) : null;

    const clone = existingCloneId
      ? await prisma.pricingRuleSet.update({
          where: { id: existingCloneId },
          data: {
            name: source.name,
            description: source.description,
            active: source.active,
            isDefault: false,
            metadata: source.metadata as Prisma.InputJsonValue,
          },
        })
      : await prisma.pricingRuleSet.create({
          data: {
            storeId,
            name: `${source.name} (Network)`,
            description: source.description,
            active: source.active,
            isDefault: false,
            metadata: source.metadata as Prisma.InputJsonValue,
          },
        });

    await prisma.pricingRule.deleteMany({ where: { ruleSetId: clone.id, storeId } });
    for (const rule of source.rules) {
      await prisma.pricingRule.create({
        data: {
          storeId,
          ruleSetId: clone.id,
          productId: rule.productId,
          name: rule.name,
          method: rule.method,
          priority: rule.priority,
          conditions: rule.conditions as Prisma.InputJsonValue,
          effects: rule.effects as Prisma.InputJsonValue,
          active: rule.active,
          printMethod: rule.printMethod,
          minQuantity: rule.minQuantity,
          maxQuantity: rule.maxQuantity,
          basePrice: rule.basePrice,
          colorSurcharge: rule.colorSurcharge,
          perPlacementCost: rule.perPlacementCost,
          quantityBreaklist: rule.quantityBreaklist as Prisma.InputJsonValue,
        },
      });
    }

    return {
      ...bindingMeta,
      cloneRuleSetId: clone.id,
      sourceRuleSetId: source.id,
      sourceVersion: sharedItem.version,
      lastAppliedAt: new Date().toISOString(),
    };
  }

  private async applyArtworkCategory(sharedItem: any, storeId: string, binding: any) {
    const source = await (prisma as any).artworkCategory.findUnique({ where: { id: sharedItem.sourceId }, include: { assets: true } });
    if (!source) throw new Error('Source artwork category not found');

    const bindingMeta = ensureObject(binding.overrideData);
    const existingCloneId = bindingMeta.cloneCategoryId ? String(bindingMeta.cloneCategoryId) : null;

    const clone = existingCloneId
      ? await (prisma as any).artworkCategory.update({
          where: { id: existingCloneId },
          data: {
            name: source.name,
            slug: `${source.slug}-${storeId.slice(0, 6)}`,
            sortOrder: source.sortOrder,
            active: source.active,
          },
        })
      : await (prisma as any).artworkCategory.create({
          data: {
            storeId,
            name: source.name,
            slug: `${source.slug}-${storeId.slice(0, 6)}`,
            sortOrder: source.sortOrder,
            active: source.active,
          },
        });

    return {
      ...bindingMeta,
      cloneCategoryId: clone.id,
      sourceCategoryId: source.id,
      sourceVersion: sharedItem.version,
      lastAppliedAt: new Date().toISOString(),
    };
  }

  private async applyArtworkAsset(sharedItem: any, storeId: string, binding: any) {
    const source = await (prisma as any).artworkAsset.findUnique({ where: { id: sharedItem.sourceId }, include: { file: true } });
    if (!source) throw new Error('Source artwork asset not found');

    const bindingMeta = ensureObject(binding.overrideData);
    const existingCloneAssetId = bindingMeta.cloneAssetId ? String(bindingMeta.cloneAssetId) : null;

    let cloneFileId = bindingMeta.cloneFileId ? String(bindingMeta.cloneFileId) : null;
    if (!cloneFileId) {
      const clonedFile = await (prisma as any).fileAsset.create({
        data: {
          storeId,
          kind: source.file.kind,
          fileName: source.file.fileName,
          mimeType: source.file.mimeType,
          url: source.file.url,
          sizeBytes: source.file.sizeBytes,
          metadata: source.file.metadata,
        },
      });
      cloneFileId = clonedFile.id;
    }

    const clone = existingCloneAssetId
      ? await (prisma as any).artworkAsset.update({
          where: { id: existingCloneAssetId },
          data: {
            storeId,
            fileId: cloneFileId,
            name: source.name,
            tags: source.tags,
            status: source.status,
            isPublic: source.isPublic,
            metadata: source.metadata,
          },
        })
      : await (prisma as any).artworkAsset.create({
          data: {
            storeId,
            fileId: cloneFileId,
            name: source.name,
            tags: source.tags,
            status: source.status,
            isPublic: source.isPublic,
            metadata: source.metadata,
          },
        });

    return {
      ...bindingMeta,
      cloneAssetId: clone.id,
      cloneFileId,
      sourceAssetId: source.id,
      sourceVersion: sharedItem.version,
      lastAppliedAt: new Date().toISOString(),
    };
  }

  async applySharedItemToStore(sharedItemId: string, storeId: string) {
    const sharedItem = await (prisma as any).sharedCatalogItem.findUnique({ where: { id: sharedItemId } });
    if (!sharedItem) throw new Error('Shared item not found');

    const binding = await this.ensureBinding(storeId, sharedItem.id);

    if (Number(binding.appliedVersion || 0) >= Number(sharedItem.version || 0)) {
      return {
        binding,
        noOp: true,
      };
    }

    let overrideData: Record<string, any> = ensureObject(binding.overrideData);
    if (sharedItem.type === 'PRODUCT') {
      overrideData = await this.applyProduct(sharedItem, storeId, binding);
    } else if (sharedItem.type === 'PRICING_RULE_SET') {
      overrideData = await this.applyPricingRuleSet(sharedItem, storeId, binding);
    } else if (sharedItem.type === 'ARTWORK_CATEGORY') {
      overrideData = await this.applyArtworkCategory(sharedItem, storeId, binding);
    } else if (sharedItem.type === 'ARTWORK_ASSET') {
      overrideData = await this.applyArtworkAsset(sharedItem, storeId, binding);
    } else {
      overrideData = {
        ...overrideData,
        sourceVersion: sharedItem.version,
        lastAppliedAt: new Date().toISOString(),
      };
    }

    const updated = await (prisma as any).storeCatalogBinding.update({
      where: { id: binding.id },
      data: {
        status: 'APPLIED',
        appliedVersion: Number(sharedItem.version || 0),
        appliedAt: new Date(),
        overrideData,
      },
    });

    return {
      binding: updated,
      noOp: false,
    };
  }

  async listBindings(storeId: string) {
    return (prisma as any).storeCatalogBinding.findMany({
      where: { storeId },
      include: { sharedCatalogItem: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}

export default new NetworkApplyService();
