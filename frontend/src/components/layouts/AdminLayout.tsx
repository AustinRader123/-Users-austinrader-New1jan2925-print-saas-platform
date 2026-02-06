import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Gauge, Package, Users, Upload, Calculator, DollarSign, Settings } from 'lucide-react';

interface AdminLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', to: '/admin', icon: Gauge },
  { label: 'Production', to: '/admin/production', icon: Package },
  { label: 'Vendors', to: '/admin/vendors', icon: Users },
  { label: 'Vendor Import', to: '/admin/vendors/import', icon: Upload },
  { label: 'Pricing Rules', to: '/admin/pricing-rules', icon: DollarSign },
  { label: 'Pricing Simulator', to: '/admin/pricing-simulator', icon: Calculator },
];

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Offset for global navbar */}
      <div className="h-16" />

      {/* Sidebar + Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block md:w-64 fixed md:top-16 bottom-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <LayoutGrid size={18} />
              <span className="font-semibold">Admin</span>
            </div>
          </div>
          <nav className="p-2 space-y-1">
            {navItems.map(({ label, to, icon: Icon }) => {
              const active = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={
                    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ` +
                    (active
                      ? 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-slate-100'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300')
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 w-full md:ml-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {title && (
              <div className="mb-6">
                <h1 className="text-2xl font-semibold">{title}</h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
