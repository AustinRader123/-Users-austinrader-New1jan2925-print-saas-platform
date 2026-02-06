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

      {/* Feature Cards + CTA */}
      <div className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mt-6">
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center hover:bg-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mx-auto mb-4">
                {/* design icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M4 4h16v2H4zM4 9h16v2H4zM4 14h16v2H4zM4 19h16v2H4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Design Products</h3>
              <p className="text-slate-300">Create stunning custom designs with an intuitive on-site editor.</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center hover:bg-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2l7 4-7 4-7-4 7-4zm0 10l7 4-7 4-7-4 7-4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Browse Catalog</h3>
              <p className="text-slate-300">Explore supplier catalogs with rich variant data and imagery.</p>
            </div>
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-8 text-center hover:bg-slate-700 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-100 text-rose-600 mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M6 2h12v4H6zM4 8h16v2H4zM4 12h16v8H4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Manage Orders</h3>
              <p className="text-slate-300">Track production with clear job states and downloadable assets.</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <a href="/designs" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
              Start Designing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
