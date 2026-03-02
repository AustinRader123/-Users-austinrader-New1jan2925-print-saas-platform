import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CreateProductionJobDto, UpdateProductionStatusDto } from './production.dto';
import { ProductionService } from './production.service';

@Controller('api/production')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ProductionController {
  constructor(private readonly service: ProductionService) {}

  @Get('board')
  @Permissions('production.read')
  board(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string) {
    return this.service.board(tenantId, storeId || 'default-store');
  }

  @Post('jobs')
  @Permissions('production.write')
  create(@Headers('x-tenant-id') tenantId: string, @Headers('x-store-id') storeId: string, @Body() body: CreateProductionJobDto) {
    return this.service.create(tenantId, storeId || 'default-store', body);
  }

  @Patch('jobs/:id/status')
  @Permissions('production.write')
  updateStatus(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Param('id') id: string,
    @Body() body: UpdateProductionStatusDto
  ) {
    return this.service.updateStatus(tenantId, storeId || 'default-store', id, body.status);
  }
}
