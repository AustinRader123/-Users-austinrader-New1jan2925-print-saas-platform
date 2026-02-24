import React from 'react';

type Tab = { value: string; label: string };

export default function Tabs({ tabs, value, onChange }: { tabs: Tab[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-default)' }}>
        {tabs.map((t) => (
          <button
            key={t.value}
            className={`px-3 py-2 text-sm ${value === t.value ? 'font-medium' : ''}`}
            style={{
              color: value === t.value ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: value === t.value ? '2px solid var(--primary)' : '2px solid transparent',
            }}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
