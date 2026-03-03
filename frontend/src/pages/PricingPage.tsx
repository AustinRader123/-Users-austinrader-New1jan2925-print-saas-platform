import React, { useState } from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function PricingPage() {
  usePageMeta(seoByPath['/pricing'].title, seoByPath['/pricing'].description);

  const [annual, setAnnual] = useState(true);
  const factor = annual ? 0.9 : 1; // 10% off annually

  const tiers = [
    {
      name: 'Starter',
      monthly: 499,
      highlight: false,
      features: [
        'Core demand forecasting',
        'Inventory health dashboards',
        'Base alerts and exceptions',
        'Standard onboarding'
      ],
      cta: { label: 'Request Demo', href: '/company/contact' },
    },
    {
      name: 'Growth',
      monthly: 1499,
      highlight: true,
      features: [
        'Replenishment automation',
        'Scenario planning',
        'Advanced integrations',
        'Priority support'
      ],
      cta: { label: 'Request Demo', href: '/company/contact' },
    },
    {
      name: 'Scale',
      monthly: 0,
      highlight: false,
      features: [
        'Enterprise governance',
        'API and automation workflows',
        'Dedicated rollout support',
        'Custom SLAs'
      ],
      cta: { label: 'Contact Sales', href: '/company/contact' },
    },
  ];

  return (
    <MarketingLayout
      eyebrow="Pricing"
      title="Pricing designed for measurable operational gains"
      subtitle="Choose the package that matches your planning maturity and inventory optimization goals."
      secondaryCtaLabel="Contact Sales"
      secondaryCtaTo="/company/contact"
    >
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-2xl font-semibold">Platform plans</h2>
        <p className="mt-2 text-slate-300">Start with core forecasting, then scale into full workflow automation and enterprise governance.</p>

        <div className="mt-6 flex items-center justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-950 px-3 py-2 shadow-sm">
            <span className="text-sm text-slate-300">Billing</span>
          <button
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
            className={`${!annual ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'} text-sm px-3 py-1 rounded-full`}
          >
            Monthly
          </button>
          <button
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
            className={`${annual ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'} text-sm px-3 py-1 rounded-full`}
          >
            Annual <span className="ml-1 text-xs">(save 10%)</span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {tiers.map((t) => {
          const price = t.monthly ? Math.round(t.monthly * factor) : null;
          return (
            <div
              key={t.name}
              className={`rounded-xl border ${t.highlight ? 'border-blue-500' : 'border-slate-800'} bg-slate-950 p-6`}
            >
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">{t.name}</div>
                {t.highlight && (
                  <span className="rounded border border-blue-900 bg-blue-950/40 px-2 py-1 text-xs font-medium text-blue-300">Most Popular</span>
                )}
              </div>
              <div className="mt-3">
                {price !== null ? (
                  <div className="text-3xl font-bold">${price}<span className="text-base font-medium text-slate-400">/mo</span></div>
                ) : (
                  <div className="text-3xl font-bold">Custom</div>
                )}
              </div>

              <ul className="mt-6 space-y-3 text-slate-300">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href={t.cta.href}
                className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 font-medium ${t.highlight ? 'bg-blue-600 text-white hover:bg-blue-500' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'}`}
              >
                {t.cta.label}
              </a>

              <div className="mt-3 text-center">
                <a href="/company/contact" className="text-sm text-blue-300 hover:text-blue-200">Request Demo</a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-center">Manual tools vs. SkuFlow workflows</h2>
        <p className="mt-2 text-center text-slate-300">Move from reactive spreadsheet operations to connected planning and execution.</p>
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-800">
          <table className="w-full bg-slate-950 text-left">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-slate-200">Category</th>
                <th className="px-4 py-3 text-slate-200">SkuFlow</th>
                <th className="px-4 py-3 text-slate-200">Manual process</th>
              </tr>
            </thead>
            <tbody>
              {[
                { f: 'Forecasting', s: 'Continuous model-based forecasting', c: 'Periodic spreadsheet updates' },
                { f: 'Replenishment', s: 'Policy-driven order recommendations', c: 'Manual reorder decisions' },
                { f: 'Exceptions', s: 'Prioritized risk alerts', c: 'Reactive issue discovery' },
                { f: 'Visibility', s: 'Unified KPI and inbound views', c: 'Data spread across systems' },
                { f: 'Execution speed', s: 'Workflow handoffs and accountability', c: 'Email and meeting dependency' },
              ].map((row) => (
                <tr key={row.f} className="odd:bg-slate-950 even:bg-slate-900/70">
                  <td className="px-4 py-3 text-slate-200">{row.f}</td>
                  <td className="px-4 py-3 text-green-700">{row.s}</td>
                  <td className="px-4 py-3 text-slate-300">{row.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </MarketingLayout>
  );
}
