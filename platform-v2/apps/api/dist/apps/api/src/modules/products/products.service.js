"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
let ProductsService = class ProductsService {
    list(tenantId, storeId) {
        return [
            { id: 'p_1', tenantId, storeId, slug: 'classic-tee', name: 'Classic Tee', updatedAt: new Date().toISOString() },
            { id: 'p_2', tenantId, storeId, slug: 'premium-hoodie', name: 'Premium Hoodie', updatedAt: new Date().toISOString() },
        ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.id < b.id ? 1 : -1));
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)()
], ProductsService);
//# sourceMappingURL=products.service.js.map