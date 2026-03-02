export declare class ProductsService {
    list(tenantId: string, storeId: string): {
        id: string;
        tenantId: string;
        storeId: string;
        slug: string;
        name: string;
        updatedAt: string;
    }[];
}
