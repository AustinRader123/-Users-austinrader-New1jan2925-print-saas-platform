import { Controller, Get, Headers } from '@nestjs/common';

@Controller('api/tenant')
export class TenantController {
  @Get('context')
  context(@Headers('x-tenant-id') tenantId?: string) {
    return {
      tenantId: tenantId || 'default-tenant',
      requestScoped: true,
    };
  }
}
