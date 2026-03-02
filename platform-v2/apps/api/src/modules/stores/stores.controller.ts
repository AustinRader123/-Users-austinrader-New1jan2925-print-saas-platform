import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { TenantGuard } from '../../common/tenant.guard';
import { AuthGuard } from '../../common/auth.guard';
import { RbacGuard } from '../../common/rbac.guard';
import { Permissions } from '../../common/permissions.decorator';
import { CreateStoreDto, UpdateStoreDto } from './stores.dto';

@Controller('api/stores')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  @Permissions('stores.read')
  list(@Req() req: any) {
    return this.service.list(req.tenantId);
  }

  @Post()
  @Permissions('stores.write')
  create(@Req() req: any, @Body() body: CreateStoreDto) {
    return this.service.create(req.tenantId, body);
  }

  @Patch(':id')
  @Permissions('stores.write')
  update(@Req() req: any, @Body() body: UpdateStoreDto) {
    return this.service.update(req.tenantId, req.params.id, body);
  }
}
