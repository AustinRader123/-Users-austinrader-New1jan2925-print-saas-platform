import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './orders.dto';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/orders')
@UseGuards(TenantGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.list(tenantId, storeId || 'default-store');
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, storeId || 'default-store', id);
  }

  @Post()
  create(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Body() body: CreateOrderDto) {
    return this.service.create(tenantId, storeId || 'default-store', body);
  }
}
