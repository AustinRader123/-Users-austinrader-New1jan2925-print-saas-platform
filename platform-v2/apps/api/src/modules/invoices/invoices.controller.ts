import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CreateInvoiceDto, RecordPaymentDto } from './invoices.dto';
import { InvoicesService } from './invoices.service';

@Controller('api/invoices')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Permissions('invoices.read')
  list(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.list(tenantId, storeId || 'default-store');
  }

  @Get(':id')
  @Permissions('invoices.read')
  getById(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, storeId || 'default-store', id);
  }

  @Post()
  @Permissions('invoices.write')
  create(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Body() body: CreateInvoiceDto) {
    return this.service.create(tenantId, storeId || 'default-store', body);
  }

  @Post(':id/payments')
  @Permissions('invoices.write', 'payments.write')
  recordPayment(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Param('id') id: string,
    @Body() body: RecordPaymentDto
  ) {
    return this.service.recordPayment(tenantId, storeId || 'default-store', id, body);
  }
}
