import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { ConvertQuoteDto, CreateQuoteDto } from './quotes.dto';
import { QuotesService } from './quotes.service';

@Controller('api/quotes')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  @Get()
  @Permissions('quotes.read')
  list(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.list(tenantId, storeId || 'default-store');
  }

  @Get(':id')
  @Permissions('quotes.read')
  getById(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, storeId || 'default-store', id);
  }

  @Post()
  @Permissions('quotes.write')
  create(@Req() req: any, @Body() body: CreateQuoteDto) {
    return this.service.create(req.tenantId, body, req.user?.id);
  }

  @Post(':id/convert')
  @Permissions('quotes.write', 'orders.write')
  convert(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Param('id') id: string,
    @Body() body: ConvertQuoteDto
  ) {
    return this.service.convertToOrder(tenantId, storeId || 'default-store', id, body);
  }
}
