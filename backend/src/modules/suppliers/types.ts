import { SupplierName } from '@prisma/client';

export type SupplierSyncOptions = {
  limitProducts?: number;
  includeImages?: boolean;
  runId?: string;
};

export type SupplierConnectionTestResult = {
  ok: boolean;
  latencyMs: number;
  authStatus: 'ok' | 'missing_credentials' | 'invalid_credentials' | 'http_error';
  sampleCounts: {
    products: number;
    variants: number;
    images: number;
  };
  warnings: string[];
  error?: string;
};

export type ExternalSupplierProduct = {
  externalProductId: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  active?: boolean;
  tags?: string[];
  variants: ExternalSupplierVariant[];
  images: ExternalSupplierImage[];
};

export type ExternalSupplierVariant = {
  externalVariantId: string;
  sku: string;
  name: string;
  size?: string;
  color?: string;
  cost?: number;
  price?: number;
  inventoryQty?: number;
};

export type ExternalSupplierImage = {
  externalImageId: string;
  url: string;
  altText?: string;
  position?: number;
};

export type SupplierAdapterConnection = {
  id: string;
  supplier: SupplierName;
  baseUrl?: string | null;
  credentials: Record<string, any>;
};

export interface SupplierAdapter {
  validateConnection(connection: SupplierAdapterConnection): Promise<SupplierConnectionTestResult>;
  fetchCatalog(connection: SupplierAdapterConnection, options?: SupplierSyncOptions): Promise<ExternalSupplierProduct[]>;
}
