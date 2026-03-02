"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignerController = void 0;
const common_1 = require("@nestjs/common");
const designer_service_1 = require("./designer.service");
const designer_dto_1 = require("./designer.dto");
const tenant_guard_1 = require("../../common/tenant.guard");
let DesignerController = class DesignerController {
    service;
    constructor(service) {
        this.service = service;
    }
    save(tenantId, storeId, userId, body) {
        return this.service.save(tenantId, storeId || 'default-store', userId || 'system', body);
    }
    list(tenantId) {
        return this.service.list(tenantId);
    }
};
exports.DesignerController = DesignerController;
__decorate([
    (0, common_1.Post)('designs'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-store-id')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, designer_dto_1.SaveDesignDto]),
    __metadata("design:returntype", void 0)
], DesignerController.prototype, "save", null);
__decorate([
    (0, common_1.Get)('designs'),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DesignerController.prototype, "list", null);
exports.DesignerController = DesignerController = __decorate([
    (0, common_1.Controller)('api/designer'),
    (0, common_1.UseGuards)(tenant_guard_1.TenantGuard),
    __metadata("design:paramtypes", [designer_service_1.DesignerService])
], DesignerController);
//# sourceMappingURL=designer.controller.js.map