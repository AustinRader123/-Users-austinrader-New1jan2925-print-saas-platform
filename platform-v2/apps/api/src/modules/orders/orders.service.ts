import { Injectable } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { CreateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly pricing: PricingService) {}

  create(tenantId: string, storeId: string, body: CreateOrderDto) {
    const lineSummaries = body.items.map((item) => {
      const priced = this.pricing.quote({
        baseUnitCost: item.baseUnitCost,
        quantity: item.quantity,
        method: body.method,
        colorCount: body.colorCount,
      } as any);
      return {
        sku: item.sku,
        quantity: item.quantity,
        pricing: priced,
      };
    });

    const total = lineSummaries.reduce((sum, line) => sum + line.pricing.total, 0);
    return {
      id: `ord_${Date.now()}`,
      tenantId,
      storeId,
      customerId: body.customerId,
      status: 'DRAFT',
      lines: lineSummaries,
      total,
      createdAt: new Date().toISOString(),
    };
  }
}
