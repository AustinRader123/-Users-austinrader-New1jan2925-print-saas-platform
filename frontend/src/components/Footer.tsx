import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-semibold">SkuFlow</span>
          </div>
          <nav className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
            <a href="/" className="hover:text-blue-600">Products</a>
            <a href="/orders" className="hover:text-blue-600">Orders</a>
            <a href="/designs" className="hover:text-blue-600">Designs</a>
          </nav>
          <div className="text-xs text-slate-500">
            © {new Date().getFullYear()} SkuFlow. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
