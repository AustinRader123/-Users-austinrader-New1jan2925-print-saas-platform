import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { DesignerService } from './designer.service';
import { SaveDesignDto } from './designer.dto';
import { TenantGuard } from '../../common/tenant.guard';

@Controller('api/designer')
@UseGuards(TenantGuard)
export class DesignerController {
  constructor(private readonly service: DesignerService) {}

  @Post('designs')
  save(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-store-id') storeId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: SaveDesignDto
  ) {
    return this.service.save(tenantId, storeId || 'default-store', userId || 'system', body);
  }

  @Get('designs')
  list(@Headers('x-tenant-id') tenantId: string) {
    return this.service.list(tenantId);
  }
}
