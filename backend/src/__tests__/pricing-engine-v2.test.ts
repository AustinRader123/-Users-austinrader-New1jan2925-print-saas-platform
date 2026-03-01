import { describe, expect, it } from 'vitest';
import { PricingEngineV2 } from '../services/PricingEngineV2.js';

describe('PricingEngineV2', () => {
  const engine = new PricingEngineV2();

  it('computes screen print pricing with deterministic output fields', () => {
    const result = engine.evaluate({
      qty: 24,
      blankUnitCost: 6.5,
      method: 'SCREEN_PRINT',
      decorationInput: {
        locations: ['front', 'back'],
        printSizeTier: 'LARGE',
        colorCount: 3,
        rush: true,
        weightOz: 9,
      },
      shippingRates: [],
      taxRates: [],
      taxExempt: false,
      rules: [],
    });

    expect(result.method).toBe('SCREEN_PRINT');
    expect(result.qty).toBe(24);
    expect(result.locations).toEqual(['front', 'back']);
    expect(result.setupFees.length).toBeGreaterThan(0);
    expect(result.shipping).toBeGreaterThan(0);
    expect(result.tax).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(result.subtotal);
    expect(result.suggestedUnitPrice).toBeGreaterThan(0);
    expect(result.effectiveMarginPct).toBeGreaterThan(0);
  });

  it('handles embroidery + tax exempt path', () => {
    const result = engine.evaluate({
      qty: 12,
      blankUnitCost: 8,
      method: 'EMBROIDERY',
      decorationInput: {
        stitchCount: 6500,
        locations: ['chest'],
        rush: false,
        weightOz: 7,
      },
      shippingRates: [
        {
          active: true,
          baseCharge: 5,
          perItemCharge: 0.2,
          perOzCharge: 0.05,
          minSubtotal: null,
          maxSubtotal: null,
          rushMultiplier: 1.5,
        },
      ],
      taxRates: [
        { active: true, rate: 0.09, appliesShipping: true },
      ],
      taxExempt: true,
      rules: [],
    });

    expect(result.method).toBe('EMBROIDERY');
    expect(result.tax).toBe(0);
    expect(result.shipping).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(result.subtotal - result.tax);
  });
});
