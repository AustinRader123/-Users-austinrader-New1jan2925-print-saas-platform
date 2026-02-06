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
        <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
        <p className="text-slate-600 mt-2">Flexible plans for growing print shops. Choose monthly or annual billing.</p>
      </div>

      <div className="flex items-center justify-center mb-8">
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm text-slate-600">Billing</span>
          <button
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
            className={`${!annual ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'} text-sm px-3 py-1 rounded-full`}
          >
            Monthly
          </button>
          <button
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
            className={`${annual ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'} text-sm px-3 py-1 rounded-full`}
          >
            Annual <span className="ml-1 text-xs">(save 10%)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const price = t.monthly ? Math.round(t.monthly * factor) : null;
          return (
            <div
              key={t.name}
              className={`rounded-xl border ${t.highlight ? 'border-blue-300' : 'border-slate-200'} bg-white p-6 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.name}</div>
                {t.highlight && (
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">Most Popular</span>
                )}
              </div>
              <div className="mt-3">
                {price !== null ? (
                  <div className="text-3xl font-bold">${price}<span className="text-base font-medium text-slate-600">/mo</span></div>
                ) : (
                  <div className="text-3xl font-bold">Custom</div>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-slate-700">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">✓</span>
                    <span>{f}</span>
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
                <a href="/contact" className="text-sm text-blue-700 hover:text-blue-800">Request Demo</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
