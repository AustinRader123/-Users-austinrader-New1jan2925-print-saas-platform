import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/products')
@UseGuards(TenantGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId = 'default-store') {
    return this.service.list(tenantId, storeId);
  }
}
