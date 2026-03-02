import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CreateVendorDto, ReceiveInventoryDto } from './vendors.dto';
import { VendorsService } from './vendors.service';

@Controller('api/vendors')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get()
  @Permissions('vendors.read')
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @Permissions('vendors.write')
  create(@Headers('x-tenant-id') tenantId: string, @Body() body: CreateVendorDto) {
    return this.service.create(tenantId, body);
  }

  @Post(':id/receive')
  @Permissions('vendors.write', 'inventory.write')
  receive(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: ReceiveInventoryDto) {
    return this.service.receiveInventory(tenantId, id, body);
  }

  @Get('inventory/stock')
  @Permissions('inventory.read')
  stock(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId = 'default-store') {
    return this.service.stock(tenantId, storeId);
  }

  @Get('sync/status')
  @Permissions('vendors.read')
  status() {
    return {
      provider: 'MOCK',
      lastRunAt: null,
      healthy: true,
    };
  }
}
