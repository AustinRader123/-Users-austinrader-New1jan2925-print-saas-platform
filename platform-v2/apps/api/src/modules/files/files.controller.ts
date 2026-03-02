import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth.guard';
import { Permissions } from '../../common/permissions.decorator';
import { RbacGuard } from '../../common/rbac.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { CreateFileAssetDto, PresignQueryDto, UpdateFileAssetDto } from './files.dto';
import { FilesService } from './files.service';

@Controller('api/files')
@UseGuards(AuthGuard, TenantGuard, RbacGuard)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Get('presign')
  @Permissions('files.write')
  presign(@Headers('x-tenant-id') tenantId: string, @Query() query: PresignQueryDto) {
    return this.service.presign(tenantId, query);
  }

  @Post()
  @Permissions('files.write')
  create(@Req() req: any, @Body() body: CreateFileAssetDto) {
    return this.service.create(req.tenantId, req.user?.id, body);
  }

  @Get()
  @Permissions('files.read')
  list(@Headers('x-tenant-id') tenantId: string, @Query('storeId') storeId?: string) {
    return this.service.list(tenantId, storeId);
  }

  @Get(':id')
  @Permissions('files.read')
  getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.getById(tenantId, id);
  }

  @Patch(':id')
  @Permissions('files.write')
  update(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @Body() body: UpdateFileAssetDto) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(':id')
  @Permissions('files.write')
  archive(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.service.archive(tenantId, id);
  }
}
