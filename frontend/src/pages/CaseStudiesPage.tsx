import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const studies = [
  {
    company: 'Specialty Retail Group',
    result: '27% reduction in stockouts',
    detail: 'Rolled out location-level alerting and replenishment workflows across 80 stores in 10 weeks.'
  },
  {
    company: 'Apparel Brand Co.',
    result: '18% lower excess inventory',
    detail: 'Introduced dynamic reorder points and scenario planning for seasonal assortment decisions.'
  },
  {
    company: 'Digital-first Commerce Team',
    result: 'Same-day planning cycle',
    detail: 'Shifted from spreadsheet coordination to centralized exceptions and role-specific KPI dashboards.'
  }
];

export default function CaseStudiesPage() {
  usePageMeta(seoByPath['/resources/case-studies'].title, seoByPath['/resources/case-studies'].description);

  return (
    <MarketingLayout
      eyebrow="Resources"
      title="Customer outcomes"
      subtitle="Measurable inventory and planning performance improvements from SkuFlow deployments."
      secondaryCtaLabel="See Guides"
      secondaryCtaTo="/resources/guides"
    >
      <div className="space-y-5">
        {studies.map((study) => (
          <article key={study.company} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm uppercase tracking-[0.15em] text-blue-300">{study.company}</p>
            <h2 className="mt-2 text-2xl font-semibold">{study.result}</h2>
            <p className="mt-3 text-slate-300">{study.detail}</p>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
