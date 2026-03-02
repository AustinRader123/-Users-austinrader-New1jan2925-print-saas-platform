"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const index_1 = require("./index");
(0, node_test_1.default)('screen print decreases by quantity break', () => {
    const small = (0, index_1.screenPrintUnitCost)(12, 3, 1);
    const large = (0, index_1.screenPrintUnitCost)(250, 3, 1);
    strict_1.default.ok(large < small);
});
(0, node_test_1.default)('embroidery scales with stitch count', () => {
    const low = (0, index_1.embroideryUnitCost)(50, 4000, 1);
    const high = (0, index_1.embroideryUnitCost)(50, 12000, 1);
    strict_1.default.ok(high > low);
});
(0, node_test_1.default)('dtf scales with area', () => {
    const small = (0, index_1.dtfUnitCost)(30, 9, 1);
    const large = (0, index_1.dtfUnitCost)(30, 64, 1);
    strict_1.default.ok(large > small);
});
(0, node_test_1.default)('pricing output includes tax and setup', () => {
    const result = (0, index_1.calculatePricing)({
        baseUnitCost: 6,
        quantity: 48,
        method: 'SCREENPRINT',
        colorCount: 3,
        locationCount: 2,
        setupFee: 30,
        shippingFlat: 20,
        markupPercent: 35,
        taxPercent: 8.25,
    });
    strict_1.default.ok(result.subtotal > 0);
    strict_1.default.ok(result.tax > 0);
    strict_1.default.ok(result.total > result.subtotal);
});
