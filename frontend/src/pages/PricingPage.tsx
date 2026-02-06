import React, { useState } from 'react';

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);
  const factor = annual ? 0.9 : 1; // 10% off annually

  const tiers = [
    {
      name: 'Starter',
      monthly: 49,
      highlight: false,
      features: [
        'On-site design editor',
        'Basic catalog + variants',
        'Order workflow & statuses',
        'Email notifications',
      ],
      cta: { label: 'Start Free Trial', href: '/register' },
    },
    {
      name: 'Growth',
      monthly: 149,
      highlight: true,
      features: [
        'Advanced product options',
        'Production boards & assets',
        'Multi-supplier catalogs',
        'Priority email support',
      ],
      cta: { label: 'Start Free Trial', href: '/register' },
    },
    {
      name: 'Scale',
      monthly: 0,
      highlight: false,
      features: [
        'Custom pricing & SLAs',
        'API access & webhooks',
        'Dedicated onboarding',
        'Phone + priority support',
      ],
      cta: { label: 'Contact Sales', href: '/contact' },
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">Pricing</h1>
        <p className="text-slate-300 mt-2">Flexible plans for growing print shops. Choose monthly or annual billing.</p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 shadow-sm">
          <span className="text-sm text-slate-300">Billing</span>
          <button
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
            className={`${!annual ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'} text-sm px-3 py-1 rounded-full`}
          >
            Monthly
          </button>
          <button
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
            className={`${annual ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'} text-sm px-3 py-1 rounded-full`}
          >
            Annual <span className="ml-1 text-xs text-slate-200">(save 10%)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const price = t.monthly ? Math.round(t.monthly * factor) : null;
          return (
            <div
              key={t.name}
              className={`rounded-xl border ${t.highlight ? 'border-blue-400' : 'border-slate-700'} bg-slate-800 p-6 hover:bg-slate-700 transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-white">{t.name}</div>
                {t.highlight && (
                  <span className="text-xs font-medium text-blue-200 bg-blue-900/40 border border-blue-700 px-2 py-1 rounded">Most Popular</span>
                )}
              </div>
              <div className="mt-3">
                {price !== null ? (
                  <div className="text-3xl font-bold text-white">${price}<span className="text-base font-medium text-slate-300">/mo</span></div>
                ) : (
                  <div className="text-3xl font-bold text-white">Custom</div>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={t.cta.href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 font-medium ${t.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {t.cta.label}
              </a>

              <div className="mt-3 text-center">
                <a href="/contact" className="text-sm text-blue-300 hover:text-blue-200">Request Demo</a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Competitor comparison */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-white text-center">Compare with Competitors</h2>
        <p className="text-slate-300 text-center mt-2">How SkuFlow stacks up against platforms like Deco Network.</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-700">
          <table className="w-full text-left bg-slate-800">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-slate-200">Feature</th>
                <th className="px-4 py-3 text-slate-200">SkuFlow</th>
                <th className="px-4 py-3 text-slate-200">Typical Competitor</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: 'On-site design editor', s: 'Modern, fast, multi-layer', c: 'Varies, often legacy UX' },
                { f: 'Production boards & assets', s: 'Built-in with status tracking', c: 'Often custom or add-on' },
                { f: 'Catalog integrations', s: 'Multi-supplier with rich variants', c: 'Single supplier or limited' },
                { f: 'API & webhooks', s: 'Available on Scale', c: 'Limited or extra cost' },
                { f: 'Pricing flexibility', s: 'Tiered + custom contracts', c: 'Fixed tiers' },
              ].map((row) => (
                <tr key={row.f} className="odd:bg-slate-800 even:bg-slate-800/80">
                  <td className="px-4 py-3 text-slate-300">{row.f}</td>
                  <td className="px-4 py-3 text-green-300">{row.s}</td>
                  <td className="px-4 py-3 text-slate-300">{row.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
