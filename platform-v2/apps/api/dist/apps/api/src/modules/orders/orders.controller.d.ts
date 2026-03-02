import { OrdersService } from './orders.service';
import { CreateOrderDto } from './orders.dto';
export declare class OrdersController {
    private readonly service;
    constructor(service: OrdersService);
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
