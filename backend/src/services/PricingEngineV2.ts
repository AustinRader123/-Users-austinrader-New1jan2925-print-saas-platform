export type DecorationMethodV2 =
  | 'SCREEN_PRINT'
  | 'EMBROIDERY'
  | 'DTF'
  | 'DTG'
  | 'LASER_ENGRAVING'
  | 'VINYL'
  | 'SUBLIMATION'
  | 'NONE';

export type DecorationInputV2 = {
  printSizeTier?: 'SMALL' | 'MEDIUM' | 'LARGE';
  colorCount?: number;
  stitchCount?: number;
  rush?: boolean;
  weightOz?: number;
  locations?: string[];
};

export type PricingRuleV2 = {
  method?: string;
  conditions?: any;
  effects?: any;
  active?: boolean;
};

export type ShippingRateV2 = {
  active: boolean;
  minSubtotal?: number | null;
  maxSubtotal?: number | null;
  baseCharge: number;
  perItemCharge: number;
  perOzCharge: number;
  rushMultiplier: number;
};

export type TaxRateV2 = {
  active: boolean;
  rate: number;
  appliesShipping: boolean;
};

export type PricingEvaluateV2Input = {
  qty: number;
  blankUnitCost: number;
  method?: string | null;
  decorationInput?: DecorationInputV2;
  shippingRates?: ShippingRateV2[];
  taxRates?: TaxRateV2[];
  taxExempt?: boolean;
  rules?: PricingRuleV2[];
};

export type PricingEvaluateV2Result = {
  qty: number;
  method: DecorationMethodV2;
  locations: string[];
  blankUnitCost: number;
  decorationUnitCost: number;
  unitCost: number;
  blanksSubtotal: number;
  decorationSubtotal: number;
  setupFees: { name: string; amount: number }[];
  shipping: number;
  taxableSubtotal: number;
  tax: number;
  subtotal: number;
  total: number;
  effectiveMarginPct: number;
  suggestedUnitPrice: number;
  suggestedLinePrice: number;
  projectedProfit: number;
  notes: string[];
};

function toMoney(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2));
}

function normalizeMethod(input?: string | null): DecorationMethodV2 {
  const value = String(input || 'NONE').trim().toUpperCase();
  switch (value) {
    case 'SCREEN_PRINT':
    case 'EMBROIDERY':
    case 'DTF':
    case 'DTG':
    case 'LASER_ENGRAVING':
    case 'VINYL':
    case 'SUBLIMATION':
      return value;
    default:
      return 'NONE';
  }
}

function decorationUnit(method: DecorationMethodV2, input: DecorationInputV2): number {
  const printSizeTier = String(input.printSizeTier || 'MEDIUM').toUpperCase();
  const sizeMultiplier = printSizeTier === 'SMALL' ? 0.9 : printSizeTier === 'LARGE' ? 1.25 : 1;
  const colorCount = Math.max(1, Number(input.colorCount || 1));
  const stitchCount = Math.max(0, Number(input.stitchCount || 0));

  if (method === 'SCREEN_PRINT') {
    return toMoney((1.2 + Math.max(0, colorCount - 1) * 0.45) * sizeMultiplier);
  }
  if (method === 'EMBROIDERY') {
    return toMoney(0.85 + (stitchCount / 1000) * 0.55);
  }
  if (method === 'DTF') {
    return toMoney(1.95 * sizeMultiplier + Math.max(0, colorCount - 1) * 0.1);
  }
  if (method === 'DTG') {
    return toMoney(2.1 * sizeMultiplier + Math.max(0, colorCount - 1) * 0.18);
  }
  if (method === 'LASER_ENGRAVING') {
    return toMoney(1.55 * sizeMultiplier);
  }
  if (method === 'VINYL') {
    return toMoney(1.35 * sizeMultiplier + Math.max(0, colorCount - 1) * 0.35);
  }
  if (method === 'SUBLIMATION') {
    return toMoney(1.75 * sizeMultiplier);
  }
  return 0;
}

function setupFees(method: DecorationMethodV2, input: DecorationInputV2): { name: string; amount: number }[] {
  if (method === 'NONE') return [];
  if (method === 'SCREEN_PRINT') {
    const colors = Math.max(1, Number(input.colorCount || 1));
    return [{ name: 'Screen Setup', amount: toMoney(18 + colors * 7) }];
  }
  if (method === 'EMBROIDERY') {
    const stitches = Math.max(0, Number(input.stitchCount || 0));
    return [{ name: 'Digitizing', amount: toMoney(20 + (stitches / 1000) * 4) }];
  }
  return [{ name: 'Setup', amount: 12 }];
}

function applyRules(unitCost: number, fees: { name: string; amount: number }[], qty: number, rules: PricingRuleV2[] | undefined, notes: string[]): { unitCost: number; fees: { name: string; amount: number }[] } {
  let nextUnit = unitCost;
  const nextFees = [...fees];
  for (const rule of rules || []) {
    if (rule.active === false) continue;
    const method = String(rule.method || '').toUpperCase();
    const conditions = rule.conditions || {};
    const effects = rule.effects || {};

    if (method === 'QUANTITY_BREAK') {
      const breaklist = Array.isArray(conditions.qtyBreaks) ? conditions.qtyBreaks : [];
      const matched = breaklist
        .slice()
        .sort((a: any, b: any) => Number(b.minQty || 0) - Number(a.minQty || 0))
        .find((entry: any) => qty >= Number(entry.minQty || 0));
      if (matched?.multiplier != null) {
        nextUnit = toMoney(nextUnit * Number(matched.multiplier));
        notes.push(`Applied qty multiplier ${Number(matched.multiplier)}`);
      }
    }

    if (method === 'MARKUP_PERCENT') {
      const pct = Number(effects.percent || 0);
      if (Number.isFinite(pct) && pct > 0) {
        nextUnit = toMoney(nextUnit * (1 + pct / 100));
        notes.push(`Applied markup ${pct}%`);
      }
    }

    if (method === 'FEE_FLAT') {
      const fee = Number(effects.amount || 0);
      if (fee > 0) {
        nextFees.push({ name: String(effects.name || 'Rule Fee'), amount: toMoney(fee) });
        notes.push('Applied flat fee rule');
      }
    }
  }
  return { unitCost: nextUnit, fees: nextFees };
}

function computeShipping(subtotal: number, qty: number, weightOz: number, rush: boolean, rates: ShippingRateV2[]): number {
  const active = (rates || []).filter((r) => r.active);
  if (active.length === 0) {
    return toMoney(8 + qty * 0.35 + weightOz * 0.06 + (rush ? 5 : 0));
  }

  const match = active.find((r) => {
    const min = r.minSubtotal == null || subtotal >= Number(r.minSubtotal);
    const max = r.maxSubtotal == null || subtotal <= Number(r.maxSubtotal);
    return min && max;
  }) || active[0];

  const base = Number(match.baseCharge || 0) + qty * Number(match.perItemCharge || 0) + weightOz * Number(match.perOzCharge || 0);
  const rushMultiplier = rush ? Number(match.rushMultiplier || 1) : 1;
  return toMoney(base * rushMultiplier);
}

function computeTax(taxableSubtotal: number, rates: TaxRateV2[], taxExempt?: boolean): number {
  if (taxExempt) return 0;
  const active = (rates || []).filter((r) => r.active);
  if (active.length === 0) {
    return toMoney(taxableSubtotal * 0.0825);
  }
  const totalRate = active.reduce((sum, r) => sum + Number(r.rate || 0), 0);
  return toMoney(taxableSubtotal * totalRate);
}

export class PricingEngineV2 {
  evaluate(input: PricingEvaluateV2Input): PricingEvaluateV2Result {
    const qty = Math.max(1, Number(input.qty || 1));
    const method = normalizeMethod(input.method);
    const decorationInput = input.decorationInput || {};
    const locations = Array.isArray(decorationInput.locations) && decorationInput.locations.length > 0
      ? decorationInput.locations
      : ['front'];
    const locationCount = Math.max(1, locations.length);
    const blankUnitCost = toMoney(Math.max(0, Number(input.blankUnitCost || 0)));
    const rush = Boolean(decorationInput.rush);
    const weightOz = Math.max(0, Number(decorationInput.weightOz || 0));

    const notes: string[] = [];
    const baseDecorationUnit = decorationUnit(method, decorationInput);
    const fees = setupFees(method, decorationInput);

    const preRuleUnit = toMoney(blankUnitCost + baseDecorationUnit * locationCount);
    const ruled = applyRules(preRuleUnit, fees, qty, input.rules, notes);

    const unitCost = toMoney(ruled.unitCost);
    const blanksSubtotal = toMoney(blankUnitCost * qty);
    const decorationSubtotal = toMoney((unitCost - blankUnitCost) * qty);
    const setupTotal = toMoney(ruled.fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0));
    const subtotal = toMoney(blanksSubtotal + decorationSubtotal + setupTotal);

    const shipping = computeShipping(subtotal, qty, weightOz * qty, rush, input.shippingRates || []);
    const taxableShipping = (input.taxRates || []).some((rate) => rate.active && rate.appliesShipping);
    const taxableSubtotal = toMoney(subtotal + (taxableShipping ? shipping : 0));
    const tax = computeTax(taxableSubtotal, input.taxRates || [], input.taxExempt);
    const total = toMoney(subtotal + shipping + tax);

    const targetMargin = 0.4;
    const suggestedLinePrice = toMoney(total / (1 - targetMargin));
    const suggestedUnitPrice = toMoney(suggestedLinePrice / qty);
    const projectedProfit = toMoney(suggestedLinePrice - total);
    const effectiveMarginPct = suggestedLinePrice > 0 ? toMoney((projectedProfit / suggestedLinePrice) * 100) : 0;

    return {
      qty,
      method,
      locations,
      blankUnitCost,
      decorationUnitCost: toMoney(baseDecorationUnit * locationCount),
      unitCost,
      blanksSubtotal,
      decorationSubtotal,
      setupFees: ruled.fees,
      shipping,
      taxableSubtotal,
      tax,
      subtotal,
      total,
      effectiveMarginPct,
      suggestedUnitPrice,
      suggestedLinePrice,
      projectedProfit,
      notes,
    };
  }
}

export default new PricingEngineV2();
