import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly service;
    constructor(service: ProductsService);
    list(tenantId: string, storeId?: string): {
        id: string;
        tenantId: string;
        storeId: string;
        slug: string;
        name: string;
        updatedAt: string;
    }[];
}
