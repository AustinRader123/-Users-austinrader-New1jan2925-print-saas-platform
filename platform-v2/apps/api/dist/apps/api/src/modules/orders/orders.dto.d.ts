export declare class CreateOrderDto {
    customerId: string;
    items: Array<{
        sku: string;
        quantity: number;
        baseUnitCost: number;
    }>;
    method: 'SCREENPRINT' | 'EMBROIDERY' | 'DTF';
    colorCount: number;
}
