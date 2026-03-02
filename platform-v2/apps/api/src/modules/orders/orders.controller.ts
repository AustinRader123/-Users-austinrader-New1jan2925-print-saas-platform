import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './orders.dto';
import { TenantGuard } from '../../common/tenant.guard';
import { AuthGuard } from '../../common/auth.guard';
import { RbacGuard } from '../../common/rbac.guard';
import { Permissions } from '../../common/permissions.decorator';

@Controller('api/orders')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @Permissions('orders.read')
  list(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.list(tenantId, storeId || 'default-store');
  }

  @Get(':id')
  @Permissions('orders.read')
  getById(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, storeId || 'default-store', id);
  }

  @Post()
  @Permissions('orders.write')
  create(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Body() body: CreateOrderDto) {
    return this.service.create(tenantId, storeId || 'default-store', body);
  }
}
