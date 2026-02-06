import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="text-sm opacity-80 mb-2">SkuFlow</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Print Shop Management Platform for Business Growth
          </h1>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto mb-8">
            Automate quotes, orders, and production in one connected platform. Reduce manual steps,
            save time, and help your team work smarter while you scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/pricing" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
              Get Your Free Demo
            </a>
            <a href="/contact" className="text-blue-300 hover:text-blue-200 underline">
              Chat with our sales team
            </a>
          </div>
        </div>
      </div>

      {/* Feature Tiles */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-semibold text-center mb-6">All the tools you need</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              'Quotes',
              'Orders',
              'Invoices',
              'eCommerce',
              'Production Calendar',
              'Product Mockups',
              'Payments',
              'Automations',
            ].map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
                <div className="text-lg font-semibold mt-1">Powerful & Connected</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
