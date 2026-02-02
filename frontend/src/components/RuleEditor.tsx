import React, { useState } from 'react';

export interface RuleDraft {
  storeId: string;
  name: string;
  method: 'SCREEN_PRINT' | 'EMBROIDERY';
  breaks: Array<{ minQty: number; unitPrice: number }>;
}

export default function RuleEditor({ initial, onChange }: { initial?: RuleDraft; onChange?: (rule: RuleDraft) => void }) {
  const [rule, setRule] = useState<RuleDraft>(
    initial || {
      storeId: 'default',
      name: 'Standard',
      method: 'SCREEN_PRINT',
      breaks: [
        { minQty: 1, unitPrice: 20 },
        { minQty: 12, unitPrice: 18.5 },
        { minQty: 48, unitPrice: 17 },
      ],
    }
  );

  const update = (patch: Partial<RuleDraft>) => {
    const next = { ...rule, ...patch } as RuleDraft;
    setRule(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input-base" placeholder="Store ID" value={rule.storeId} onChange={(e) => update({ storeId: e.target.value })} />
        <input className="input-base" placeholder="Name" value={rule.name} onChange={(e) => update({ name: e.target.value })} />
        <select className="input-base" value={rule.method} onChange={(e) => update({ method: e.target.value as any })}>
          <option value="SCREEN_PRINT">SCREEN_PRINT</option>
          <option value="EMBROIDERY">EMBROIDERY</option>
        </select>
      </div>
      <div>
        <label className="text-sm">Breaks (JSON)</label>
        <textarea
          className="input-base w-full h-24"
          value={JSON.stringify(rule.breaks, null, 2)}
          onChange={(e) => {
            try {
              update({ breaks: JSON.parse(e.target.value) });
            } catch {}
          }}
        />
      </div>
    </div>
  );
}