import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CrmService } from './crm.service';

@Controller('api/crm')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @Get('pipeline')
  @Permissions('crm.read')
  pipeline(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.pipeline(tenantId, storeId || 'default-store');
  }

  @Get('customers')
  @Permissions('crm.read')
  customers(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId?: string) {
    return this.service.listCustomers(tenantId, storeId);
  }

  @Get('customers/:id')
  @Permissions('crm.read')
  customer(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.getCustomer(tenantId, id);
  }

  @Get('customers/:id/timeline')
  @Permissions('crm.read')
  timeline(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.customerTimeline(tenantId, id);
  }
}
