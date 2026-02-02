# PASS/FAIL - Pricing MVP

## Checks
- Admin rule creation: PASS (201, ruleId returned)
- List rules by store: PASS (returns created rule)
- Pricing preview by productVariantId: PASS
- Quantity breaks: PASS (unit price decreases at 12 and 48)
- Decoration method differences: PASS (EMBROIDERY vs SCREEN_PRINT)
- Rounding strategy: PASS (nearest cent)

## Evidence
- Rule ID: cml4fe83q0001dqr65s4v7cjv
- Variant ID: cml4f2vhz000a11xu2c4hla35
- Store ID: cml43c2kt000110xp4pq3a76b

### Preview Outputs
- Qty 1 (SCREEN_PRINT): unit 20.69, total 30.69
- Qty 12 (SCREEN_PRINT): unit 19.39, total 242.68
- Qty 48 (SCREEN_PRINT): unit 18.09, total 878.32
- Qty 12 (EMBROIDERY): unit 19.89, total 253.68

## Commands
See docs/pricing.md for the exact curl commands.
