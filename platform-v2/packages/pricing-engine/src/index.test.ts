import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePricing, screenPrintUnitCost, embroideryUnitCost, dtfUnitCost } from './index';

test('screen print decreases by quantity break', () => {
  const small = screenPrintUnitCost(12, 3, 1);
  const large = screenPrintUnitCost(250, 3, 1);
  assert.ok(large < small);
});

test('embroidery scales with stitch count', () => {
  const low = embroideryUnitCost(50, 4000, 1);
  const high = embroideryUnitCost(50, 12000, 1);
  assert.ok(high > low);
});

test('dtf scales with area', () => {
  const small = dtfUnitCost(30, 9, 1);
  const large = dtfUnitCost(30, 64, 1);
  assert.ok(large > small);
});

test('pricing output includes tax and setup', () => {
  const result = calculatePricing({
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

  assert.ok(result.subtotal > 0);
  assert.ok(result.tax > 0);
  assert.ok(result.total > result.subtotal);
});
