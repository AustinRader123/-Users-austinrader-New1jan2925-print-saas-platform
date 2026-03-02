import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto, RunAutomationDto, UpdateAutomationRuleDto } from './automation.dto';

@Controller('api/automation')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class AutomationController {
  constructor(private readonly service: AutomationService) {}

  @Get('rules')
  @Permissions('automation.read')
  rules(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId?: string) {
    return this.service.list(tenantId, storeId);
  }

  @Post('rules')
  @Permissions('automation.write')
  create(@Headers('x-tenant-id') tenantId: string, @Body() body: CreateAutomationRuleDto) {
    return this.service.create(tenantId, body);
  }

  @Patch('rules/:id')
  @Permissions('automation.write')
  update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: UpdateAutomationRuleDto) {
    return this.service.update(tenantId, id, body);
  }

  @Post('rules/:id/run')
  @Permissions('automation.write')
  run(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: RunAutomationDto) {
    return this.service.run(tenantId, id, body);
  }
}
