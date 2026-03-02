import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthResult, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async register(input: RegisterDto, tenantContext: string) {
    const tenant = await this.resolveTenant(tenantContext);
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, email, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('email already registered');
    }

    const created = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash: this.hashPassword(input.password),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
      },
      select: { id: true },
    });

    return this.issueAuthTokens({
      userId: created.id,
      tenantId: tenant.id,
      email,
      permissions: this.defaultPermissions(),
    });
  }

  async login(email: string, password: string, tenantContext: string): Promise<AuthResult> {
    if (!email || !password) {
      throw new UnauthorizedException('invalid credentials');
    }

    const tenant = await this.resolveTenant(tenantContext);
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: normalizedEmail,
        deletedAt: null,
        isActive: true,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.passwordHash !== this.hashPassword(password)) {
      throw new UnauthorizedException('invalid credentials');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const rolePermissions: string[] = user.roles.flatMap((userRole: any) =>
      userRole.role.permissions.map((rp: any) => rp.permission.key as string)
    );
    const permissions = rolePermissions.length > 0 ? Array.from(new Set(rolePermissions)) : this.defaultPermissions();

    return this.issueAuthTokens({
      userId: user.id,
      tenantId: tenant.id,
      email: normalizedEmail,
      permissions,
    });
  }

  async me(accessToken: string) {
    const payload = await this.jwt.verifyAsync<{ sub: string; tenantId: string; email?: string }>(accessToken);
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        type: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('invalid token');
    }
    return user;
  }

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async resolveTenant(tenantContext: string) {
    const normalized = (tenantContext || 'default').trim().toLowerCase();

    const byId = await this.prisma.tenant.findUnique({ where: { id: normalized } });
    if (byId) {
      return byId;
    }

    const bySlug = await this.prisma.tenant.findUnique({ where: { slug: normalized } });
    if (bySlug) {
      return bySlug;
    }

    const safeSlug = normalized
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `tenant-${randomBytes(4).toString('hex')}`;

    return this.prisma.tenant.create({
      data: {
        slug: safeSlug,
        name: safeSlug
          .split('-')
          .filter(Boolean)
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(' '),
      },
    });
  }

  private defaultPermissions() {
    return [
      'orders.read',
      'orders.write',
      'quotes.read',
      'quotes.write',
      'pricing.read',
      'pricing.write',
      'designer.write',
      'stores.read',
      'stores.write',
      'products.read',
      'products.write',
      'crm.read',
      'vendors.read',
      'vendors.write',
      'inventory.read',
      'inventory.write',
      'automation.read',
      'automation.write',
      'notifications.read',
      'notifications.write',
      'audit.read',
      'invoices.read',
      'invoices.write',
      'payments.write',
      'production.read',
      'production.write',
    ];
  }

  private async issueAuthTokens(params: {
    userId: string;
    tenantId: string;
    email: string;
    permissions: string[];
  }): Promise<AuthResult> {
    const token = await this.jwt.signAsync({
      sub: params.userId,
      email: params.email,
      tenantId: params.tenantId,
      permissions: params.permissions,
    });
    const refreshToken = await this.jwt.signAsync(
      { sub: params.userId, tenantId: params.tenantId, type: 'refresh' },
      { expiresIn: '30d' }
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      token,
      refreshToken,
      tenantId: params.tenantId,
      permissions: params.permissions,
    };
  }
}
