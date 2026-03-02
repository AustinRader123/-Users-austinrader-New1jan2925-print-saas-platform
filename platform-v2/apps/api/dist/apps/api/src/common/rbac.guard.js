"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacGuard = void 0;
const common_1 = require("@nestjs/common");
let RbacGuard = class RbacGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const required = req.requiredPermissions;
        if (!required || required.length === 0)
            return true;
        const permissions = req.user?.permissions || [];
        const missing = required.filter((permission) => !permissions.includes(permission));
        if (missing.length > 0) {
            throw new common_1.ForbiddenException(`missing permissions: ${missing.join(',')}`);
        }
        return true;
    }
};
exports.RbacGuard = RbacGuard;
exports.RbacGuard = RbacGuard = __decorate([
    (0, common_1.Injectable)()
], RbacGuard);
//# sourceMappingURL=rbac.guard.js.map