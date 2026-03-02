import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/stores')
@UseGuards(TenantGuard)
export class StoresController {
  constructor(private readonly service: StoresService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.service.list(tenantId);
  }
}
