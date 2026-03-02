import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login(email: string, password: string, tenantId: string) {
    if (!email || !password) throw new UnauthorizedException('invalid credentials');

    const permissions = ['orders.read', 'orders.write', 'pricing.read', 'pricing.write', 'designer.write'];
    const token = await this.jwt.signAsync({ sub: email.toLowerCase(), tenantId, permissions });
    const refreshToken = await this.jwt.signAsync({ sub: email.toLowerCase(), tenantId, type: 'refresh' }, { expiresIn: '30d' });
    return { token, refreshToken, tenantId, permissions };
  }
}
