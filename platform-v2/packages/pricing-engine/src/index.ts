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

const round2 = (value: number) => Math.round(value * 100) / 100;

function quantityMultiplier(quantity: number): number {
  if (quantity >= 500) return 0.82;
  if (quantity >= 250) return 0.86;
  if (quantity >= 100) return 0.9;
  if (quantity >= 50) return 0.94;
  if (quantity >= 25) return 0.97;
  return 1;
}

export function screenPrintUnitCost(quantity: number, colorCount: number, locationCount: number): number {
  const base = 1.75;
  const color = Math.max(0, colorCount - 1) * 0.45;
  const locations = Math.max(1, locationCount) * 0.55;
  return round2((base + color + locations) * quantityMultiplier(quantity));
}

export function embroideryUnitCost(quantity: number, stitchCount: number, locationCount: number): number {
  const thousandStitches = Math.max(1, stitchCount / 1000);
  const stitchCost = thousandStitches * 0.38;
  const locationCost = Math.max(1, locationCount) * 0.65;
  return round2((1.6 + stitchCost + locationCost) * quantityMultiplier(quantity));
}

export function dtfUnitCost(quantity: number, areaSqIn: number, locationCount: number): number {
  const areaCost = Math.max(1, areaSqIn) * 0.12;
  const locationCost = Math.max(1, locationCount) * 0.5;
  return round2((1.2 + areaCost + locationCost) * quantityMultiplier(quantity));
}

export function calculatePricing(input: PricingInput): PricingOutput {
  const minQty = input.minimumOrderQty ?? 1;
  if (input.quantity < minQty) {
    throw new Error(`minimum order quantity is ${minQty}`);
  }

  const setupFee = round2(input.setupFee ?? (input.method === 'SCREENPRINT' ? 25 : 0));
  const shipping = round2(input.shippingFlat ?? 0);
  const rushPercent = (input.rushPercent ?? 0) / 100;
  const markup = 1 + (input.markupPercent ?? 0) / 100;
  const taxRate = (input.taxPercent ?? 0) / 100;
  const locationCount = input.locationCount ?? 1;

  let unitDecorationCost = 0;
  if (input.method === 'SCREENPRINT') {
    unitDecorationCost = screenPrintUnitCost(input.quantity, input.colorCount ?? 1, locationCount);
  } else if (input.method === 'EMBROIDERY') {
    unitDecorationCost = embroideryUnitCost(input.quantity, input.stitchCount ?? 5000, locationCount);
  } else {
    unitDecorationCost = dtfUnitCost(input.quantity, input.dtfAreaSqIn ?? 36, locationCount);
  }

  const basePlusDecoration = (input.baseUnitCost + unitDecorationCost) * markup;
  const rushFeeUnit = basePlusDecoration * rushPercent;
  const unitTotalBeforeTax = round2(basePlusDecoration + rushFeeUnit);
  const subtotal = round2(unitTotalBeforeTax * input.quantity + setupFee + shipping);
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);

  return {
    unitDecorationCost,
    unitTotalBeforeTax,
    subtotal,
    tax,
    shipping,
    setupFee,
    rushFee: round2(rushFeeUnit * input.quantity),
    total,
  };
}
