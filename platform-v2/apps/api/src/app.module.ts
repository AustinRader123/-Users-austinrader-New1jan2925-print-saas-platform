import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { RolesModule } from './modules/roles/roles.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { DesignerModule } from './modules/designer/designer.module';
import { OrdersModule } from './modules/orders/orders.module';
import { EventsGateway } from './modules/websockets/events.gateway';
import { HealthController } from './health.controller';
import { UsersModule } from './modules/users/users.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { CrmModule } from './modules/crm/crm.module';
import { ProductionModule } from './modules/production/production.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { AutomationModule } from './modules/automation/automation.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthGuard } from './common/auth.guard';
import { RbacGuard } from './common/rbac.guard';
import { QuotesModule } from './modules/quotes/quotes.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
    AuthModule,
    TenantModule,
    RolesModule,
    PricingModule,
    DesignerModule,
    OrdersModule,
    QuotesModule,
    UsersModule,
    StoresModule,
    ProductsModule,
    CrmModule,
    ProductionModule,
    VendorsModule,
    AutomationModule,
    NotificationsModule,
    FilesModule,
    AuditModule,
  ],
  controllers: [HealthController],
  providers: [EventsGateway, AuthGuard, RbacGuard],
})
export class AppModule {}
