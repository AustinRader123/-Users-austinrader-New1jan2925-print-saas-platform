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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const pricing_service_1 = require("../pricing/pricing.service");
let OrdersService = class OrdersService {
    pricing;
    constructor(pricing) {
        this.pricing = pricing;
    }
    create(tenantId, storeId, body) {
        const lineSummaries = body.items.map((item) => {
            const priced = this.pricing.quote({
                baseUnitCost: item.baseUnitCost,
                quantity: item.quantity,
                method: body.method,
                colorCount: body.colorCount,
            });
            return {
                sku: item.sku,
                quantity: item.quantity,
                pricing: priced,
            };
        });
        const total = lineSummaries.reduce((sum, line) => sum + line.pricing.total, 0);
        return {
            id: `ord_${Date.now()}`,
            tenantId,
            storeId,
            customerId: body.customerId,
            status: 'DRAFT',
            lines: lineSummaries,
            total,
            createdAt: new Date().toISOString(),
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map