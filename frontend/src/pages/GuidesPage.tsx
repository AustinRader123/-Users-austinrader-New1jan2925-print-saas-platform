import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const guides = [
  {
    title: 'Demand Forecasting Maturity Playbook',
    summary: 'A phased roadmap for moving from manual forecast cycles to operational forecasting workflows.'
  },
  {
    title: 'Inventory Policy Design Guide',
    summary: 'How to define service-level, safety-stock, and reorder policies by product behavior.'
  },
  {
    title: 'Executive KPI Operating Model',
    summary: 'Build a weekly leadership rhythm around forecast quality, inventory health, and cash outcomes.'
  }
];

export default function GuidesPage() {
  usePageMeta(seoByPath['/resources/guides'].title, seoByPath['/resources/guides'].description);

  return (
    <MarketingLayout
      eyebrow="Resources"
      title="Operational guides"
      subtitle="Practical frameworks for forecasting, replenishment, and cross-functional inventory execution."
      secondaryCtaLabel="Read Case Studies"
      secondaryCtaTo="/resources/case-studies"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {guides.map((guide) => (
          <article key={guide.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">{guide.title}</h2>
            <p className="mt-3 text-slate-300">{guide.summary}</p>
            <button className="mt-5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              Download guide
            </button>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
