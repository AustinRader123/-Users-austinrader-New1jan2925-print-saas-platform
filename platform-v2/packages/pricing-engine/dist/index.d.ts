export type DecorationMethod = 'SCREENPRINT' | 'EMBROIDERY' | 'DTF';
export interface PricingInput {
    baseUnitCost: number;
    quantity: number;
    method: DecorationMethod;
    colorCount?: number;
    stitchCount?: number;
    dtfAreaSqIn?: number;
    locationCount?: number;
    rushPercent?: number;
    setupFee?: number;
    shippingFlat?: number;
    markupPercent?: number;
    taxPercent?: number;
    minimumOrderQty?: number;
}
export interface PricingOutput {
    unitDecorationCost: number;
    unitTotalBeforeTax: number;
    subtotal: number;
    tax: number;
    shipping: number;
    setupFee: number;
    rushFee: number;
    total: number;
}
export declare function screenPrintUnitCost(quantity: number, colorCount: number, locationCount: number): number;
export declare function embroideryUnitCost(quantity: number, stitchCount: number, locationCount: number): number;
export declare function dtfUnitCost(quantity: number, areaSqIn: number, locationCount: number): number;
export declare function calculatePricing(input: PricingInput): PricingOutput;
