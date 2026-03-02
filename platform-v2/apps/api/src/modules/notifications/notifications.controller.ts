import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CreateNotificationDto, UpdateNotificationStatusDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Permissions('notifications.read')
  list(@Headers('x-tenant-id') tenantId: string, @Query('status') status?: string, @Query('storeId') storeId?: string) {
    return this.service.list(tenantId, status, storeId);
  }

  @Post()
  @Permissions('notifications.write')
  enqueue(@Headers('x-tenant-id') tenantId: string, @Body() body: CreateNotificationDto) {
    return this.service.enqueue(tenantId, body);
  }

  @Post('queue/pull')
  @Permissions('notifications.write')
  pullQueued(
    @Headers('x-tenant-id') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('limit') limit?: string
  ) {
    return this.service.pullQueued(tenantId, storeId, limit ? Number(limit) : 25);
  }

  @Patch(':id/status')
  @Permissions('notifications.write')
  markStatus(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: UpdateNotificationStatusDto) {
    return this.service.markStatus(tenantId, id, body);
  }
}
