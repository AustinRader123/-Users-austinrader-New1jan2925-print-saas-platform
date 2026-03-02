import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<any>();
    const required = req.requiredPermissions as string[] | undefined;
    if (!required || required.length === 0) return true;

    const permissions: string[] = req.user?.permissions || [];
    const missing = required.filter((permission) => !permissions.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(`missing permissions: ${missing.join(',')}`);
    }
    return true;
  }
}
