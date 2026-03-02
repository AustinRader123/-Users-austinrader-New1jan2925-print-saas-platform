import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: RegisterDto, @Headers('x-tenant-id') tenantIdHeader?: string) {
    const tenantContext = tenantIdHeader || 'default';
    return this.authService.register(body, tenantContext);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Headers('x-tenant-id') tenantIdHeader?: string) {
    const tenantContext = tenantIdHeader || 'default';
    return this.authService.login(body.email, body.password, tenantContext);
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const token = this.extractBearer(authorization);
    return this.authService.me(token);
  }

  private extractBearer(authorization?: string) {
    if (!authorization) {
      throw new UnauthorizedException('missing authorization header');
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('invalid authorization header');
    }
    return token;
  }
}
