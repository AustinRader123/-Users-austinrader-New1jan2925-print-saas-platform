import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import crypto from 'crypto';
import StorageProvider from './StorageProvider.js';
import PublicStorefrontService from './PublicStorefrontService.js';
import PricingRuleService from './PricingRuleService.js';
import FeatureGateService from './FeatureGateService.js';

const prisma = new PrismaClient();

type AnyJson = Record<string, any>;

type PreviewInput = {
  productId: string;
  variantId: string;
  customization: AnyJson;
  storeId: string;
};

function clamp(num: number, min: number, max: number) {
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function cleanText(input: string, maxLength = 80) {
  return String(input || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isAllowedImageMime(mime: string) {
  return ['image/png', 'image/jpeg', 'image/webp'].includes(String(mime || '').toLowerCase());
}

function base64urlToken(size = 24) {
  return crypto.randomBytes(size).toString('hex');
}

export class CustomizerService {
  async assertFeatureByStore(storeId: string) {
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { tenantId: true } });
    if (!store?.tenantId) throw new Error('Store tenant not found');
    const allowed = await FeatureGateService.can(store.tenantId, 'customizer.enabled');
    if (!allowed) throw new Error('Customizer feature is not enabled for this plan');
  }

  async getAdminBuilderData(storeId: string, productId: string) {
    await this.assertFeatureByStore(storeId);

    const profile = await (prisma as any).productCustomizationProfile.findFirst({
      where: { storeId, productId },
      include: {
        personalizationSchemas: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
        artworkCategories: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            assets: {
              where: { status: 'ACTIVE' },
              include: { file: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    return profile;
  }

  async upsertProfile(input: { storeId: string; productId: string; enabled?: boolean; locations: any; rules?: any }) {
    await this.assertFeatureByStore(input.storeId);

    const profile = await (prisma as any).productCustomizationProfile.upsert({
      where: { productId: input.productId },
      update: {
        enabled: input.enabled ?? true,
        locations: input.locations,
        rules: input.rules ?? null,
      },
      create: {
        storeId: input.storeId,
        productId: input.productId,
        enabled: input.enabled ?? true,
        locations: input.locations,
        rules: input.rules ?? null,
      },
    });

    return profile;
  }

  async upsertPersonalizationSchemas(input: {
    storeId: string;
    productId: string;
    schemas: Array<{
      id?: string;
      key: string;
      label: string;
      type: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      options?: any;
      pricing?: any;
      validation?: any;
      sortOrder?: number;
      active?: boolean;
    }>;
  }) {
    await this.assertFeatureByStore(input.storeId);

    const profile = await (prisma as any).productCustomizationProfile.findFirst({ where: { storeId: input.storeId, productId: input.productId } });
    if (!profile) throw new Error('Customization profile not found for product');

    const existing = await (prisma as any).personalizationSchema.findMany({ where: { storeId: input.storeId, profileId: profile.id } });
    const keepIds = input.schemas.map((schema) => schema.id).filter((id): id is string => Boolean(id));
    const removeIds = existing.map((row: any) => String(row.id)).filter((id: string) => !keepIds.includes(id));
    if (removeIds.length > 0) {
      await (prisma as any).personalizationSchema.deleteMany({ where: { id: { in: removeIds }, storeId: input.storeId } });
    }

    for (const schema of input.schemas) {
      const payload = {
        storeId: input.storeId,
        productId: input.productId,
        profileId: profile.id,
        key: cleanText(schema.key, 64),
        label: cleanText(schema.label, 120),
        type: cleanText(schema.type, 24) || 'TEXT',
        required: Boolean(schema.required),
        minLength: schema.minLength ?? null,
        maxLength: schema.maxLength ?? null,
        options: schema.options ?? null,
        pricing: schema.pricing ?? null,
        validation: schema.validation ?? null,
        sortOrder: schema.sortOrder ?? 0,
        active: schema.active ?? true,
      };

      if (schema.id) {
        await (prisma as any).personalizationSchema.update({ where: { id: schema.id }, data: payload });
      } else {
        await (prisma as any).personalizationSchema.create({ data: payload });
      }
    }

    return (prisma as any).personalizationSchema.findMany({
      where: { storeId: input.storeId, profileId: profile.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async listArtworkCategories(storeId: string, profileId?: string) {
    await this.assertFeatureByStore(storeId);
    return (prisma as any).artworkCategory.findMany({
      where: { storeId, ...(profileId ? { profileId } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        assets: {
          where: { status: 'ACTIVE' },
          include: { file: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async upsertArtworkCategory(input: {
    storeId: string;
    profileId?: string;
    id?: string;
    name: string;
    slug: string;
    sortOrder?: number;
    active?: boolean;
  }) {
    await this.assertFeatureByStore(input.storeId);

    if (input.id) {
      return (prisma as any).artworkCategory.update({
        where: { id: input.id },
        data: {
          name: cleanText(input.name, 120),
          slug: cleanText(input.slug, 120).toLowerCase(),
          sortOrder: input.sortOrder ?? 0,
          active: input.active ?? true,
        },
      });
    }

    return (prisma as any).artworkCategory.create({
      data: {
        storeId: input.storeId,
        profileId: input.profileId || null,
        name: cleanText(input.name, 120),
        slug: cleanText(input.slug, 120).toLowerCase(),
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true,
      },
    });
  }

  async uploadArtworkAsset(input: {
    storeId: string;
    categoryId?: string;
    file: Express.Multer.File;
    name?: string;
    tags?: string[];
    createdById?: string;
  }) {
    await this.assertFeatureByStore(input.storeId);

    if (!input.file?.buffer || !isAllowedImageMime(input.file.mimetype)) {
      throw new Error('Only PNG/JPEG/WEBP artwork files are allowed');
    }

    const uploaded = await StorageProvider.uploadFile(input.file.buffer, input.file.originalname || 'artwork.png', 'customizer/artwork');
    const fileAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: input.storeId,
        kind: 'CUSTOMIZER_UPLOAD',
        fileName: uploaded.fileName,
        mimeType: input.file.mimetype,
        url: uploaded.url,
        sizeBytes: uploaded.size,
        createdById: input.createdById || null,
      },
    });

    return (prisma as any).artworkAsset.create({
      data: {
        storeId: input.storeId,
        categoryId: input.categoryId || null,
        fileId: fileAsset.id,
        name: cleanText(input.name || input.file.originalname || 'Artwork', 140),
        tags: Array.isArray(input.tags) ? input.tags.map((tag) => cleanText(tag, 40)).filter(Boolean) : [],
        status: 'ACTIVE',
        isPublic: true,
        createdById: input.createdById || null,
      },
      include: { file: true },
    });
  }

  async resolvePublicStore(input: { storeSlug?: string; storeId?: string; host?: string }) {
    return PublicStorefrontService.resolveStore({
      storeSlug: input.storeSlug,
      storeId: input.storeId,
      host: input.host,
    });
  }

  async getPublicCustomizerData(input: { storeSlug?: string; storeId?: string; host?: string; productId: string }) {
    const store = await this.resolvePublicStore(input);
    await this.assertFeatureByStore(store.id);

    const profile = await (prisma as any).productCustomizationProfile.findFirst({
      where: { storeId: store.id, productId: input.productId, enabled: true },
      include: {
        personalizationSchemas: {
          where: { active: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!profile) return null;

    const categories = await (prisma as any).artworkCategory.findMany({
      where: { storeId: store.id, profileId: profile.id, active: true },
      include: {
        assets: {
          where: { status: 'ACTIVE', isPublic: true },
          include: { file: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      store,
      profile,
      categories,
    };
  }

  private normalizeAndValidateCustomization(profile: any, input: AnyJson) {
    const locations = Array.isArray(profile?.locations) ? profile.locations : [];
    const locationMap = new Map<string, any>();
    for (const loc of locations) {
      const key = cleanText(String(loc?.key || loc?.id || ''), 64);
      if (key) locationMap.set(key, loc);
    }

    const payloadLocations = Array.isArray(input?.locations) ? input.locations : [];
    if (payloadLocations.length === 0) throw new Error('At least one customization location is required');

    const normalizedLocations = payloadLocations.map((loc: any) => {
      const key = cleanText(String(loc?.key || ''), 64);
      const spec = locationMap.get(key);
      if (!spec) throw new Error(`Invalid customization location: ${key}`);

      const bounds = spec?.bounds || {};
      const maxW = Number(bounds.maxWidth ?? 1200);
      const maxH = Number(bounds.maxHeight ?? 1200);

      const normalizedLayers = (Array.isArray(loc?.layers) ? loc.layers : []).slice(0, 25).map((layer: any) => {
        const type = cleanText(String(layer?.type || 'TEXT').toUpperCase(), 24);
        const width = clamp(Number(layer?.width ?? 100), 10, maxW);
        const height = clamp(Number(layer?.height ?? 40), 10, maxH);
        const x = clamp(Number(layer?.x ?? 0), 0, Math.max(0, maxW - width));
        const y = clamp(Number(layer?.y ?? 0), 0, Math.max(0, maxH - height));
        const rotation = clamp(Number(layer?.rotation ?? 0), -45, 45);

        const out: AnyJson = {
          type,
          x,
          y,
          width,
          height,
          rotation,
        };

        if (type === 'TEXT') {
          out.text = cleanText(String(layer?.text || ''), 80);
          out.font = cleanText(String(layer?.font || 'sans-serif'), 40);
          out.color = cleanText(String(layer?.color || '#111111'), 16);
          if (!out.text) throw new Error('Text layers require text content');
        }

        if (type === 'ARTWORK') {
          out.artworkAssetId = cleanText(String(layer?.artworkAssetId || ''), 64);
          if (!out.artworkAssetId) throw new Error('Artwork layers require artworkAssetId');
        }

        if (type === 'UPLOAD') {
          out.fileId = cleanText(String(layer?.fileId || ''), 64);
          if (!out.fileId) throw new Error('Upload layers require fileId');
        }

        return out;
      });

      return {
        key,
        layers: normalizedLayers,
      };
    });

    const personalization = typeof input?.personalization === 'object' && input.personalization
      ? input.personalization
      : {};

    const safePersonalization: AnyJson = {};
    for (const [key, value] of Object.entries(personalization)) {
      safePersonalization[cleanText(key, 64)] = cleanText(String(value ?? ''), 120);
    }

    return {
      locations: normalizedLocations,
      personalization: safePersonalization,
    };
  }

  async createUploadForPublic(input: {
    storeSlug?: string;
    storeId?: string;
    host?: string;
    file: Express.Multer.File;
  }) {
    const store = await this.resolvePublicStore(input);
    await this.assertFeatureByStore(store.id);

    if (!input.file?.buffer || !isAllowedImageMime(input.file.mimetype)) {
      throw new Error('Only PNG/JPEG/WEBP uploads are allowed');
    }

    const uploaded = await StorageProvider.uploadFile(input.file.buffer, input.file.originalname || 'upload.png', 'customizer/uploads');
    const fileAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: store.id,
        kind: 'CUSTOMIZER_UPLOAD',
        fileName: uploaded.fileName,
        mimeType: input.file.mimetype,
        url: uploaded.url,
        sizeBytes: uploaded.size,
      },
    });

    return {
      storeId: store.id,
      fileId: fileAsset.id,
      url: fileAsset.url,
      mimeType: fileAsset.mimeType,
      sizeBytes: fileAsset.sizeBytes,
    };
  }

  private async renderPreviewPng(input: PreviewInput) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
    });

    const width = 1200;
    const height = 1200;
    const bg = '#ffffff';
    const title = cleanText(product?.name || 'Customized Product', 120);
    const variantText = cleanText(`Variant ${input.variantId.slice(0, 8)}`, 80);
    const locCount = Array.isArray(input.customization.locations) ? input.customization.locations.length : 0;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bg}"/>
        <rect x="40" y="40" width="1120" height="1120" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2"/>
        <text x="70" y="110" font-size="44" font-family="Arial" fill="#0F172A">${title}</text>
        <text x="70" y="158" font-size="28" font-family="Arial" fill="#334155">${variantText}</text>
        <text x="70" y="202" font-size="24" font-family="Arial" fill="#334155">Locations: ${locCount}</text>
      </svg>
    `;

    const baseBuffer = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: '#FFFFFF',
      },
    })
      .png()
      .toBuffer();

    const composed = await sharp(baseBuffer)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer();

    const uploaded = await StorageProvider.uploadFile(composed, `preview_${base64urlToken(6)}.png`, 'customizer/previews');
    const fileAsset = await (prisma as any).fileAsset.create({
      data: {
        storeId: input.storeId,
        kind: 'CUSTOMIZER_PREVIEW',
        fileName: uploaded.fileName,
        mimeType: 'image/png',
        url: uploaded.url,
        sizeBytes: uploaded.size,
      },
    });

    return fileAsset;
  }

  async preview(input: {
    storeSlug?: string;
    storeId?: string;
    host?: string;
    productId: string;
    variantId: string;
    customization: AnyJson;
  }) {
    const data = await this.getPublicCustomizerData({
      storeSlug: input.storeSlug,
      storeId: input.storeId,
      host: input.host,
      productId: input.productId,
    });
    if (!data?.profile) throw new Error('Customizer profile not found for product');

    const normalized = this.normalizeAndValidateCustomization(data.profile, input.customization);

    const previewFile = await this.renderPreviewPng({
      storeId: data.store.id,
      productId: input.productId,
      variantId: input.variantId,
      customization: normalized,
    });

    return {
      previewFileId: previewFile.id,
      previewUrl: previewFile.url,
      customization: normalized,
      storeId: data.store.id,
      profileId: data.profile.id,
    };
  }

  private async personalizationFees(storeId: string, profileId: string, personalization: AnyJson, qty: number) {
    const schemas = await (prisma as any).personalizationSchema.findMany({
      where: { storeId, profileId, active: true },
      orderBy: { sortOrder: 'asc' },
    });

    const fees: Array<{ name: string; amount: number }> = [];

    for (const schema of schemas as any[]) {
      const key = String(schema.key || '');
      const value = cleanText(String(personalization?.[key] || ''), 120);
      if (schema.required && !value) throw new Error(`Missing required personalization field: ${key}`);
      if (schema.minLength && value.length < Number(schema.minLength)) throw new Error(`Personalization too short: ${key}`);
      if (schema.maxLength && value.length > Number(schema.maxLength)) throw new Error(`Personalization too long: ${key}`);

      const pricing = (schema.pricing || {}) as AnyJson;
      const flat = Number(pricing.flatFee || 0);
      const perChar = Number(pricing.perCharacter || 0);
      const perItem = Number(pricing.perItem || 0);
      const fieldTotal = Number((flat + perChar * value.length + perItem * qty).toFixed(2));
      if (fieldTotal > 0) {
        fees.push({
          name: `personalization:${key}`,
          amount: fieldTotal,
        });
      }
    }

    return fees;
  }

  private async ensureSystemUser() {
    const email = 'public-customizer@system.local';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return existing;

    const passwordHash = crypto.createHash('sha256').update('public-customizer').digest('hex');
    return prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Public Customizer',
        role: 'ADMIN',
      },
    });
  }

  async customizeAndAddToCart(input: {
    cartToken: string;
    productId: string;
    variantId: string;
    quantity: number;
    customization: AnyJson;
    previewFileId?: string;
  }) {
    const cart = await PublicStorefrontService.getCartByToken(input.cartToken);
    if (!cart?.storeId) throw new Error('Cart not found');

    await this.assertFeatureByStore(cart.storeId);

    const profile = await (prisma as any).productCustomizationProfile.findFirst({
      where: { storeId: cart.storeId, productId: input.productId, enabled: true },
    });
    if (!profile) throw new Error('Product is not customizable');

    const normalized = this.normalizeAndValidateCustomization(profile, input.customization);

    const product = await prisma.product.findFirst({ where: { id: input.productId, storeId: cart.storeId } });
    if (!product) throw new Error('Product not found');

    const variant = await prisma.productVariant.findFirst({ where: { id: input.variantId, productId: input.productId, storeId: cart.storeId } });
    if (!variant) throw new Error('Variant not found');

    const qty = Math.max(1, Number(input.quantity || 1));

    const personalizationFees = await this.personalizationFees(cart.storeId, profile.id, normalized.personalization, qty);
    const pricing = await PricingRuleService.evaluate({
      storeId: cart.storeId,
      productId: product.id,
      variantId: variant.id,
      qty,
      decorationMethod: 'CUSTOMIZER',
      locations: normalized.locations.map((loc: any) => String(loc.key)),
      personalizationFees,
    } as any);

    const systemUser = await this.ensureSystemUser();

    const design = await prisma.design.create({
      data: {
        userId: systemUser.id,
        productId: product.id,
        name: `Customization ${product.name}`,
        content: normalized,
        status: 'EXPORTED',
        metadata: {
          source: 'public-customizer',
          profileId: profile.id,
        },
      },
    });

    let previewFile = null as any;
    if (input.previewFileId) {
      previewFile = await (prisma as any).fileAsset.findFirst({ where: { id: input.previewFileId, storeId: cart.storeId } });
    }
    if (!previewFile) {
      previewFile = await this.renderPreviewPng({
        storeId: cart.storeId,
        productId: product.id,
        variantId: variant.id,
        customization: normalized,
      });
    }

    const customization = await (prisma as any).customization.create({
      data: {
        storeId: cart.storeId,
        productId: product.id,
        variantId: variant.id,
        profileId: profile.id,
        designId: design.id,
        previewFileId: previewFile.id,
        payload: normalized,
        pricingSnapshot: pricing,
        status: 'IN_CART',
      },
    });

    await prisma.cartItem.create({
      data: {
        storeId: cart.storeId,
        cartId: cart.id,
        productId: product.id,
        variantId: variant.id,
        productVariantId: variant.id,
        qty: { units: qty } as any,
        quantity: qty,
        decorationMethod: 'CUSTOMIZER',
        decorationLocations: normalized.locations.map((loc: any) => String(loc.key)),
        designId: design.id,
        pricingSnapshotData: pricing,
        mockupUrl: previewFile.url,
        customizationId: customization.id,
        customizationJson: normalized,
        previewFileId: previewFile.id,
      } as any,
    });

    await (PublicStorefrontService as any).recalculateCartTotal(cart.id);

    return PublicStorefrontService.getCartByToken(input.cartToken);
  }
}

export default new CustomizerService();
