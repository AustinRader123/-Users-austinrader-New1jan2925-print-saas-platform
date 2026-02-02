import React from 'react';

export default function PricingBreakdownCard({ result }: { result: any }) {
  if (!result) return null;
  const { currency, unitPrice, lineTotal, breakdown } = result || {};
  return (
    <div className="card p-4">
      <div className="font-medium mb-2">Pricing Preview</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div>Currency: {currency}</div>
          <div>Unit Price: ${typeof unitPrice === 'number' ? unitPrice.toFixed(2) : unitPrice}</div>
          <div>Line Total: ${typeof lineTotal === 'number' ? lineTotal.toFixed(2) : lineTotal}</div>
        </div>
        <div>
          <div>Applied Rule: {breakdown?.ruleId || '-'}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-sm font-medium mb-1">Breakdown</div>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(breakdown, null, 2)}</pre>
      </div>
    </div>
  );
}