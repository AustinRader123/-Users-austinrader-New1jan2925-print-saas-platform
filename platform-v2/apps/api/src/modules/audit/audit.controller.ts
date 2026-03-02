import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { AuditEntriesQueryDto, AuditSummaryQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

@Controller('api/audit')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('entries')
  @Permissions('audit.read')
  entries(@Headers('x-tenant-id') tenantId: string, @Query() query: AuditEntriesQueryDto) {
    return this.service.entries(tenantId, query);
  }

  @Get('summary')
  @Permissions('audit.read')
  summary(@Headers('x-tenant-id') tenantId: string, @Query() query: AuditSummaryQueryDto) {
    return this.service.summary(tenantId, query);
  }
}
