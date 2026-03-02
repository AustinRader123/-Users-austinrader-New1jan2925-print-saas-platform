import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const authorization = req.headers['authorization'] as string | undefined;

    if (!authorization) {
      throw new UnauthorizedException('missing authorization header');
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('invalid authorization header');
    }

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenantId: string;
        permissions?: string[];
        email?: string;
      }>(token);

      req.user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        permissions: payload.permissions ?? [],
        email: payload.email,
      };

      return true;
    } catch {
      throw new UnauthorizedException('invalid token');
    }
  }
}
