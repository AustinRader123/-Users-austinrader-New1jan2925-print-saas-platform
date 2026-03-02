export declare enum DecorationMethodDto {
    SCREENPRINT = "SCREENPRINT",
    EMBROIDERY = "EMBROIDERY",
    DTF = "DTF"
}
export declare class PriceQuoteDto {
    baseUnitCost: number;
    quantity: number;
    method: DecorationMethodDto;
    colorCount?: number;
    stitchCount?: number;
    dtfAreaSqIn?: number;
    locationCount?: number;
    setupFee?: number;
    shippingFlat?: number;
    markupPercent?: number;
    taxPercent?: number;
    rushPercent?: number;
}
