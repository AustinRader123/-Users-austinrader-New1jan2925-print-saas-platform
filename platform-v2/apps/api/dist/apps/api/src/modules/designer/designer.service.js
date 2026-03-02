"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignerService = void 0;
const common_1 = require("@nestjs/common");
let DesignerService = class DesignerService {
    designs = new Map();
    save(tenantId, storeId, userId, input) {
        const id = `des_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const created = {
            id,
            tenantId,
            storeId,
            userId,
            ...input,
            version: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.designs.set(id, created);
        return created;
    }
    list(tenantId) {
        return Array.from(this.designs.values())
            .filter((d) => d.tenantId === tenantId)
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id < b.id ? 1 : -1));
    }
};
exports.DesignerService = DesignerService;
exports.DesignerService = DesignerService = __decorate([
    (0, common_1.Injectable)()
], DesignerService);
//# sourceMappingURL=designer.service.js.map