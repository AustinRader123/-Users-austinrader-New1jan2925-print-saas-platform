import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('tenant context required');
    }
    req.tenantId = String(tenantId);
    return true;
  }
}
