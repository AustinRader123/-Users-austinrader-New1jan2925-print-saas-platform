"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./modules/auth/auth.module");
const tenant_module_1 = require("./modules/tenant/tenant.module");
const roles_module_1 = require("./modules/roles/roles.module");
const pricing_module_1 = require("./modules/pricing/pricing.module");
const designer_module_1 = require("./modules/designer/designer.module");
const orders_module_1 = require("./modules/orders/orders.module");
const events_gateway_1 = require("./modules/websockets/events.gateway");
const health_controller_1 = require("./health.controller");
const users_module_1 = require("./modules/users/users.module");
const stores_module_1 = require("./modules/stores/stores.module");
const products_module_1 = require("./modules/products/products.module");
const crm_module_1 = require("./modules/crm/crm.module");
const production_module_1 = require("./modules/production/production.module");
const vendors_module_1 = require("./modules/vendors/vendors.module");
const automation_module_1 = require("./modules/automation/automation.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const files_module_1 = require("./modules/files/files.module");
const audit_module_1 = require("./modules/audit/audit.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            tenant_module_1.TenantModule,
            roles_module_1.RolesModule,
            pricing_module_1.PricingModule,
            designer_module_1.DesignerModule,
            orders_module_1.OrdersModule,
            users_module_1.UsersModule,
            stores_module_1.StoresModule,
            products_module_1.ProductsModule,
            crm_module_1.CrmModule,
            production_module_1.ProductionModule,
            vendors_module_1.VendorsModule,
            automation_module_1.AutomationModule,
            notifications_module_1.NotificationsModule,
            files_module_1.FilesModule,
            audit_module_1.AuditModule,
        ],
        controllers: [health_controller_1.HealthController],
        providers: [events_gateway_1.EventsGateway],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map