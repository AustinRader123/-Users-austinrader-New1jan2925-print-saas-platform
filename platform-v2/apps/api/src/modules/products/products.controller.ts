import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { TenantGuard } from '../../common/tenant.guard';
import { AuthGuard } from '../../common/auth.guard';
import { RbacGuard } from '../../common/rbac.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateProductDto, UpdateProductDto } from './products.dto';

@Controller('api/products')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Permissions('products.read')
  list(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId = 'default-store') {
    return this.service.list(tenantId, storeId);
  }

  @Post()
  @Permissions('products.write')
  create(@Req() req: any, @Body() body: CreateProductDto) {
    return this.service.create(req.tenantId, body);
  }

  @Patch(':id')
  @Permissions('products.write')
  update(@Req() req: any, @Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.service.update(req.tenantId, id, body);
  }
}
