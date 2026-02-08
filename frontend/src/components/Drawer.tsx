import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  width?: number;
};

export default function Drawer({ open, onClose, title, children, width = 420 }: Props) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`absolute right-0 top-0 h-full bg-white border-l border-slate-200 w-[${width}px] shadow-xl transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="border-b border-slate-200 px-3 py-2 text-sm font-semibold flex items-center justify-between">
          <span>{title}</span>
          <button className="rounded-sm border px-2 py-1 text-xs" onClick={onClose}>Close</button>
        </div>
        <div className="p-3 text-sm">{children}</div>
      </div>
    </div>
  );
}
