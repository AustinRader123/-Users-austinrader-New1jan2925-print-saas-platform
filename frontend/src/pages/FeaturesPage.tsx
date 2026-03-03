import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { features, seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function FeaturesPage() {
  usePageMeta(seoByPath['/features'].title, seoByPath['/features'].description);

  return (
    <MarketingLayout
      eyebrow="Features"
      title="Feature depth for modern inventory operations"
      subtitle="Every capability is designed to move teams from analysis to action with less manual overhead and stronger decision control."
      secondaryCtaLabel="View Solutions"
      secondaryCtaTo="/solutions"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.slug} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">{feature.name}</h2>
            <p className="mt-2 text-sm text-slate-300">{feature.summary}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.15em] text-blue-300">Who it's for</p>
            <p className="mt-1 text-sm text-slate-300">{feature.whoFor}</p>
            <Link to={`/features/${feature.slug}`} className="mt-4 inline-block text-sm font-semibold text-blue-300 hover:text-blue-200">
              View feature details →
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold">For planners</h3>
          <p className="mt-2 text-slate-300">Forecast quality controls, scenario analysis, and policy-based planning workflows.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold">For operators</h3>
          <p className="mt-2 text-slate-300">Exception queues, actionable alerts, and daily execution visibility by location and category.</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold">For leadership</h3>
          <p className="mt-2 text-slate-300">Unified KPI dashboards for stock health, forecast confidence, and working-capital performance.</p>
        </div>
      </div>
    </MarketingLayout>
  );
}
