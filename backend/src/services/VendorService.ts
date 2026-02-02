import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import logger from '../logger.js';

const prisma = new PrismaClient();

export interface VendorConnector {
  listProducts(): Promise<any[]>;
  listVariants(productId: string): Promise<any[]>;
  syncInventory(): Promise<any>;
  syncPricing(): Promise<any>;
  downloadImages(products: any[]): Promise<any[]>;
}

export class CSVConnector implements VendorConnector {
  constructor(private vendor: any) {}

  async listProducts(): Promise<any[]> {
    // CSV connector would parse CSV data
    logger.info(`CSV connector: listing products for ${this.vendor.name}`);
    return [];
  }

  async listVariants(productId: string): Promise<any[]> {
    logger.info(`CSV connector: listing variants for product ${productId}`);
    return [];
  }

  async syncInventory(): Promise<any> {
    logger.info(`CSV connector: syncing inventory for ${this.vendor.name}`);
    return { status: 'completed' };
  }

  async syncPricing(): Promise<any> {
    logger.info(`CSV connector: syncing pricing for ${this.vendor.name}`);
    return { status: 'completed' };
  }

  async downloadImages(products: any[]): Promise<any[]> {
    logger.info(`CSV connector: downloading images for ${products.length} products`);
    return products;
  }
}

export class APIConnector implements VendorConnector {
  constructor(private vendor: any) {}

  async listProducts(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.vendor.apiEndpoint}/products`, {
        headers: { Authorization: `Bearer ${this.vendor.apiKey}` },
      });
      return response.data;
    } catch (error) {
      logger.error(`API connector error for ${this.vendor.name}:`, error);
      throw error;
    }
  }

  async listVariants(productId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.vendor.apiEndpoint}/products/${productId}/variants`,
        {
          headers: { Authorization: `Bearer ${this.vendor.apiKey}` },
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`API connector error for ${this.vendor.name}:`, error);
      throw error;
    }
  }

  async syncInventory(): Promise<any> {
    const products = await this.listProducts();
    logger.info(`API connector: syncing ${products.length} products for ${this.vendor.name}`);
    return { status: 'completed', productsCount: products.length };
  }

  async syncPricing(): Promise<any> {
    const products = await this.listProducts();
    logger.info(`API connector: syncing pricing for ${products.length} products`);
    return { status: 'completed', productsCount: products.length };
  }

  async downloadImages(products: any[]): Promise<any[]> {
    logger.info(`API connector: downloading images for ${products.length} products`);
    return products;
  }
}

export class VendorService {
  async getConnector(vendor: any): Promise<VendorConnector> {
    switch (vendor.connectorType) {
      case 'api':
        return new APIConnector(vendor);
      case 'csv':
      default:
        return new CSVConnector(vendor);
    }
  }

  async createVendor(name: string, email: string, connectorType: string = 'csv') {
    return prisma.vendor.create({
      data: {
        name,
        email,
        connectorType,
      },
    });
  }

  async getVendor(vendorId: string) {
    return prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        products: true,
        vendorProducts: true,
      },
    });
  }

  async listVendors() {
    return prisma.vendor.findMany({
      include: {
        products: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async syncVendorProducts(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new Error('Vendor not found');

    await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: 'SYNCING' },
    });

    try {
      const connector = await this.getConnector(vendor);
      const products = await connector.listProducts();

      // Create sync job record
      await prisma.vendorSyncJob.create({
        data: {
          vendorId,
          type: 'products',
          status: 'PROCESSING',
        },
      });

      // Store vendor products
      for (const product of products) {
        await prisma.vendorProduct.upsert({
          where: {
            vendorId_externalId: {
              vendorId,
              externalId: product.id,
            },
          },
          create: {
            vendorId,
            externalId: product.id,
            name: product.name,
            description: product.description,
            basePrice: product.price,
            brand: product.brand,
            category: product.category,
            imageUrl: product.imageUrl,
            syncData: product,
          },
          update: {
            name: product.name,
            description: product.description,
            basePrice: product.price,
            syncData: product,
            lastSyncedAt: new Date(),
          },
        });
      }

      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'ACTIVE',
          lastSyncAt: new Date(),
          lastSyncStatus: `Synced ${products.length} products`,
        },
      });

      logger.info(`Successfully synced ${products.length} products from vendor ${vendor.name}`);
    } catch (error) {
      logger.error(`Vendor sync error for ${vendor.name}:`, error);
      await prisma.vendor.update({
        where: { id: vendorId },
        data: {
          status: 'ACTIVE',
          lastSyncStatus: `Error: ${(error as any).message}`,
        },
      });
      throw error;
    }
  }

  async getVendorProducts(vendorId: string) {
    return prisma.vendorProduct.findMany({
      where: { vendorId },
      include: { variants: true },
    });
  }
}

export default new VendorService();
