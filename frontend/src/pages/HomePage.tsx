import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to DecoNetwork</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Custom Product Commerce & Production Platform
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="card p-8 text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2">Design Products</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Create stunning custom designs with our intuitive online designer
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-xl font-bold mb-2">Browse Catalog</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Explore thousands of blank apparel and products from our suppliers
              </p>
            </div>

            <div className="card p-8 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Manage Orders</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Track your orders from design to production and delivery
              </p>
            </div>
          </div>

          <div className="mt-16">
            <a href="/designs" className="btn btn-primary px-8 py-3 text-lg">
              Start Designing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
