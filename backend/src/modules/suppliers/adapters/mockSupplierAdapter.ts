import { SupplierAdapter, SupplierAdapterConnection } from '../types.js';

const svgToDataUrl = (label: string, color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="42" font-family="Arial">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const MOCK_PRODUCTS = [
  {
    externalProductId: 'mock-tee-001',
    name: 'Mock Classic Tee',
    description: 'Soft cotton mock tee for sync testing',
    category: 'T-Shirts',
    brand: 'MockBrand',
    active: true,
    tags: ['mock', 'tee'],
    variants: [
      {
        externalVariantId: 'mock-tee-001-black-m',
        sku: 'MOCK-TEE-BLK-M',
        name: 'Black / M',
        color: 'Black',
        size: 'M',
        cost: 7.5,
        price: 12.99,
        inventoryQty: 90,
      },
      {
        externalVariantId: 'mock-tee-001-navy-l',
        sku: 'MOCK-TEE-NVY-L',
        name: 'Navy / L',
        color: 'Navy',
        size: 'L',
        cost: 7.95,
        price: 13.49,
        inventoryQty: 65,
      },
    ],
    images: [
      {
        externalImageId: 'mock-tee-001-front',
        url: svgToDataUrl('MOCK TEE', '#0f172a'),
        altText: 'Mock tee front',
        position: 0,
      },
    ],
  },
  {
    externalProductId: 'mock-hoodie-002',
    name: 'Mock Fleece Hoodie',
    description: 'Premium fleece hoodie for phase 3 smoke',
    category: 'Hoodies',
    brand: 'MockBrand',
    active: true,
    tags: ['mock', 'hoodie'],
    variants: [
      {
        externalVariantId: 'mock-hoodie-002-heather-xl',
        sku: 'MOCK-HOOD-HGR-XL',
        name: 'Heather / XL',
        color: 'Heather Gray',
        size: 'XL',
        cost: 16.75,
        price: 29.95,
        inventoryQty: 44,
      },
    ],
    images: [
      {
        externalImageId: 'mock-hoodie-002-front',
        url: svgToDataUrl('MOCK HOODIE', '#334155'),
        altText: 'Mock hoodie front',
        position: 0,
      },
    ],
  },
];

export class MockSupplierAdapter implements SupplierAdapter {
  async validateConnection(_connection: SupplierAdapterConnection) {
    return {
      ok: true,
      latencyMs: 1,
      authStatus: 'ok' as const,
      sampleCounts: { products: 2, variants: 3, images: 2 },
      warnings: [],
    };
  }

  async fetchCatalog(_connection: SupplierAdapterConnection, options?: { limitProducts?: number }) {
    const copy = JSON.parse(JSON.stringify(MOCK_PRODUCTS));
    if (options?.limitProducts && options.limitProducts > 0) {
      return copy.slice(0, options.limitProducts);
    }
    return copy;
  }
}
