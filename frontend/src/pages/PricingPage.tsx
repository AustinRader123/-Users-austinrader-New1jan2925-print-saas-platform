import React from 'react';

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-semibold mb-4">Pricing</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">Flexible plans for growing print shops. Request a demo to learn more.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Starter', price: '$49/mo' },
          { name: 'Growth', price: '$149/mo' },
          { name: 'Scale', price: 'Custom' },
        ].map((p) => (
          <div key={p.name} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="text-2xl font-bold mt-2">{p.price}</div>
            <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Request Demo</button>
          </div>
        ))}
      </div>
    </div>
  );
}
