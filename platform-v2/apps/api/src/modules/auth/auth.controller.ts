import { Body, Controller, Headers, Post } from '@nestjs/common';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Headers('x-tenant-id') tenantIdHeader?: string) {
    const tenantId = tenantIdHeader || 'default-tenant';
    return this.authService.login(body.email, body.password, tenantId);
  }
}
