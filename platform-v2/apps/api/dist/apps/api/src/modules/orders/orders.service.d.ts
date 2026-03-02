import { PricingService } from '../pricing/pricing.service';
import { CreateOrderDto } from './orders.dto';
export declare class OrdersService {
    private readonly pricing;
    constructor(pricing: PricingService);
    create(tenantId: string, storeId: string, body: CreateOrderDto): {
        id: string;
        tenantId: string;
        storeId: string;
        customerId: string;
        status: string;
        lines: {
            sku: string;
            quantity: number;
            pricing: import("@pricing/index").PricingOutput;
        }[];
        total: number;
        createdAt: string;
    };
}
