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
exports.PriceQuoteDto = exports.DecorationMethodDto = void 0;
const class_validator_1 = require("class-validator");
var DecorationMethodDto;
(function (DecorationMethodDto) {
    DecorationMethodDto["SCREENPRINT"] = "SCREENPRINT";
    DecorationMethodDto["EMBROIDERY"] = "EMBROIDERY";
    DecorationMethodDto["DTF"] = "DTF";
})(DecorationMethodDto || (exports.DecorationMethodDto = DecorationMethodDto = {}));
class PriceQuoteDto {
    baseUnitCost;
    quantity;
    method;
    colorCount;
    stitchCount;
    dtfAreaSqIn;
    locationCount;
    setupFee;
    shippingFlat;
    markupPercent;
    taxPercent;
    rushPercent;
}
exports.PriceQuoteDto = PriceQuoteDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "baseUnitCost", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(DecorationMethodDto),
    __metadata("design:type", String)
], PriceQuoteDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "colorCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "stitchCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "dtfAreaSqIn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "locationCount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "setupFee", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "shippingFlat", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "markupPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "taxPercent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PriceQuoteDto.prototype, "rushPercent", void 0);
//# sourceMappingURL=pricing.dto.js.map