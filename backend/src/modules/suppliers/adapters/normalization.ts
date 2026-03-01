import { ExternalSupplierImage, ExternalSupplierProduct, ExternalSupplierVariant } from '../types.js';

const toStringSafe = (value: unknown, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  const v = String(value).trim();
  return v.length > 0 ? v : fallback;
};

const toNumberSafe = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const cleanSlugPiece = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const composeSku = (baseSku: string, color: string, size: string, externalVariantId: string) => {
  const normalizedBase = cleanSlugPiece(baseSku || externalVariantId || 'variant').toUpperCase();
  const colorPart = cleanSlugPiece(color || 'na').toUpperCase();
  const sizePart = cleanSlugPiece(size || 'na').toUpperCase();
  return `${normalizedBase}-${colorPart}-${sizePart}`;
};

export function normalizeVariant(raw: any, productExternalId: string): ExternalSupplierVariant {
  const externalVariantId = toStringSafe(raw.externalVariantId || raw.id || raw.variantId || raw.sku, `variant-${productExternalId}`);
  const color = toStringSafe(raw.color || raw.colour || raw.colorName, 'Unspecified');
  const size = toStringSafe(raw.size || raw.sizeName || raw.dimension, 'One Size');
  const baseSku = toStringSafe(raw.sku || raw.style || productExternalId, externalVariantId);

  return {
    externalVariantId,
    sku: composeSku(baseSku, color, size, externalVariantId),
    name: toStringSafe(raw.name || `${color} / ${size}`, `${color} / ${size}`),
    color,
    size,
    cost: toNumberSafe(raw.cost ?? raw.wholesalePrice ?? raw.netPrice, 0),
    price: toNumberSafe(raw.price ?? raw.retailPrice ?? raw.listPrice, 0),
    inventoryQty: Math.max(0, Math.trunc(toNumberSafe(raw.inventoryQty ?? raw.stock ?? raw.quantityOnHand, 0))),
  };
}

export function normalizeImage(raw: any, productExternalId: string, fallbackPosition: number): ExternalSupplierImage | null {
  const url = toStringSafe(raw.url || raw.imageUrl || raw.src, '');
  if (!url) return null;

  return {
    externalImageId: toStringSafe(raw.externalImageId || raw.id || `${productExternalId}-img-${fallbackPosition}`),
    url,
    altText: toStringSafe(raw.altText || raw.alt || ''),
    position: Math.max(0, Math.trunc(toNumberSafe(raw.position, fallbackPosition))),
  };
}

export function normalizeProduct(raw: any, supplierCode: string): ExternalSupplierProduct {
  const externalProductId = toStringSafe(raw.externalProductId || raw.id || raw.productId, `product-${Date.now()}`);
  const variantsRaw = Array.isArray(raw.variants) ? raw.variants : [];
  const imagesRaw = Array.isArray(raw.images) ? raw.images : [];

  const variants = variantsRaw.map((variant: any) => normalizeVariant(variant, externalProductId));
  const images = imagesRaw
    .map((image: any, index: number) => normalizeImage(image, externalProductId, index))
    .filter(Boolean) as ExternalSupplierImage[];

  return {
    externalProductId: `${supplierCode.toLowerCase()}-${externalProductId}`,
    name: toStringSafe(raw.name || raw.title || raw.productName, `Supplier Product ${externalProductId}`),
    description: toStringSafe(raw.description || raw.longDescription || ''),
    category: toStringSafe(raw.category || raw.categoryName || 'Uncategorized'),
    brand: toStringSafe(raw.brand || raw.brandName || supplierCode),
    active: raw.active !== false,
    tags: Array.isArray(raw.tags) ? raw.tags.map((t: unknown) => toStringSafe(t)).filter(Boolean) : [],
    variants,
    images,
  };
}
