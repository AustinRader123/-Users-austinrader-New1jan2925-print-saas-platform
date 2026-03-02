import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.service.list(tenantId);
  }
}
