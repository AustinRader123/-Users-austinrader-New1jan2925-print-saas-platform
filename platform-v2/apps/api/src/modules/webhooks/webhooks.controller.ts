import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import {
  DispatchWebhookRetriesDto,
  CreateWebhookDto,
  QueueWebhookRetryDto,
  RecordWebhookDeliveryDto,
  UpdateWebhookDto,
} from './webhooks.dto';
import { WebhooksService } from './webhooks.service';

@Controller('api/webhooks')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get()
  @Permissions('webhooks.read')
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query('storeId') storeId?: string,
    @Query('eventType') eventType?: string,
    @Query('provider') provider?: string
  ) {
    return this.service.list(tenantId, storeId, eventType, provider);
  }

  @Post()
  @Permissions('webhooks.write')
  create(@Headers('x-tenant-id') tenantId: string, @Body() body: CreateWebhookDto) {
    return this.service.create(tenantId, body);
  }

  @Patch(':id')
  @Permissions('webhooks.write')
  update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: UpdateWebhookDto) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @Permissions('webhooks.write')
  remove(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  @Get('deliveries')
  @Permissions('webhooks.read')
  deliveries(
    @Headers('x-tenant-id') tenantId: string,
    @Query('webhookId') webhookId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string
  ) {
    return this.service.deliveries(tenantId, webhookId, status, limit ? Number(limit) : 100);
  }

  @Get('retries')
  @Permissions('webhooks.read')
  retries(
    @Headers('x-tenant-id') tenantId: string,
    @Query('webhookId') webhookId?: string,
    @Query('status') status?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string
  ) {
    return this.service.retries(tenantId, webhookId, status, action, limit ? Number(limit) : 100);
  }

  @Get('retries/summary')
  @Permissions('webhooks.read')
  retriesSummary(
    @Headers('x-tenant-id') tenantId: string,
    @Query('webhookId') webhookId?: string,
    @Query('hours') hours?: string
  ) {
    return this.service.retriesSummary(tenantId, webhookId, hours ? Number(hours) : 24);
  }

  @Post(':id/deliveries')
  @Permissions('webhooks.write')
  recordDelivery(
    @Headers('x-tenant-id') tenantId: string,
    @Param('id') id: string,
    @Body() body: RecordWebhookDeliveryDto
  ) {
    return this.service.recordDelivery(tenantId, id, body);
  }

  @Post(':id/retries/queue')
  @Permissions('webhooks.write')
  queueRetry(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: QueueWebhookRetryDto) {
    return this.service.queueRetry(tenantId, id, body);
  }

  @Post('retries/dispatch')
  @Permissions('webhooks.write')
  dispatchRetries(@Headers('x-tenant-id') tenantId: string, @Body() body: DispatchWebhookRetriesDto) {
    return this.service.dispatchRetries(tenantId, body);
  }
}
