import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './orders.dto';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Body() body: CreateOrderDto) {
    return this.service.create(tenantId, storeId || 'default-store', body);
  }
}
