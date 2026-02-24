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
        className={`absolute right-0 top-0 h-full w-[${width}px] transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)' }}
      >
        <div className="px-3 py-2 text-sm font-semibold flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <span>{title}</span>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <div className="p-3 text-sm">{children}</div>
      </div>
    </div>
  );
}
