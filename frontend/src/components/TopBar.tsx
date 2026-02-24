import React from 'react';
import { useUIStore } from '../stores/uiStore';
import { Input } from '../ui/Input';

export default function TopBar() {
  const { toggleDensity, density } = useUIStore();
  return (
    <header className="topbar sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2">
          <Input className="w-[420px]" placeholder="Search orders, customers, products..." />
          <button className="btn btn-secondary">New Order</button>
          <button className="btn btn-secondary">Add Product</button>
        </div>
        <div className="flex items-center gap-2">
          <select className="select-base w-[160px]">
            <option>Default Store</option>
          </select>
          <button className="btn btn-secondary">Notifications</button>
          <button className="btn btn-secondary">Account</button>
          <button className="btn btn-ghost" onClick={toggleDensity} aria-label="Toggle density">
            {density === 'compact' ? 'Compact' : 'Comfortable'}
          </button>
        </div>
      </div>
      <div className="px-3 py-1 text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
        {/* Breadcrumb row placeholder; use <Breadcrumbs /> in pages */}
        <span>Admin Portal</span>
      </div>
    </header>
  );
}
