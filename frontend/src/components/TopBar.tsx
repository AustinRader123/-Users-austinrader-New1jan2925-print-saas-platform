import React from 'react';

export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            placeholder="Search orders, customers, products..."
            className="w-[420px] rounded-sm border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-200"
          />
          <button className="rounded-sm border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">New Order</button>
          <button className="rounded-sm border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Add Product</button>
        </div>

        <div className="flex items-center gap-2">
          <select className="rounded-sm border border-slate-300 px-2 py-1 text-xs">
            <option>Default Store</option>
          </select>
          <button className="rounded-sm border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Notifications</button>
          <button className="rounded-sm border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Account</button>
        </div>
      </div>
    </header>
  );
}
