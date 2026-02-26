import React from 'react';

type Item = { label: string; onSelect?: () => void };

export function DropdownMenu({ trigger, items }: { trigger: React.ReactNode; items: Item[] }) {
  return (
    <div className="relative inline-block text-left">
      <div>{trigger}</div>
      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
        <div className="py-1">
          {items.map((it, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <button key={i} onClick={it.onSelect} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100">
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DropdownMenu;
