import React from 'react';

type Tab = { value: string; label: string };

export default function Tabs({ tabs, value, onChange }: { tabs: Tab[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.value}
            className={`px-3 py-2 text-sm ${value === t.value ? 'border-b-2 border-slate-800 font-medium' : 'text-slate-700'}`}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
