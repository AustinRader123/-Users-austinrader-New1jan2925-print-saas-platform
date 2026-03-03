import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ResourcesPage() {
  usePageMeta(seoByPath['/resources'].title, seoByPath['/resources'].description);

  return (
    <MarketingLayout
      eyebrow="Resources"
      title="Insights and playbooks for operational retail teams"
      subtitle="Learn practical ways to improve forecast quality, reduce stockouts, and optimize inventory investment."
      secondaryCtaLabel="Request Demo"
      secondaryCtaTo="/company/contact"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <Link to="/resources/docs" className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
          <h2 className="text-xl font-semibold">Docs</h2>
          <p className="mt-3 text-slate-300">Implementation docs, onboarding steps, and API/integration references.</p>
        </Link>
        <Link to="/resources/blog" className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
          <h2 className="text-xl font-semibold">Blog</h2>
          <p className="mt-3 text-slate-300">Operational insights on forecasting, replenishment, and inventory execution.</p>
        </Link>
        <Link to="/resources/case-studies" className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
          <h2 className="text-xl font-semibold">Case studies</h2>
          <p className="mt-3 text-slate-300">Measured customer outcomes showing real improvements in stock and cash performance.</p>
        </Link>
        <Link to="/resources/guides" className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
          <h2 className="text-xl font-semibold">Guides</h2>
          <p className="mt-3 text-slate-300">Step-by-step playbooks for planning maturity, replenishment policy, and KPI operations.</p>
        </Link>
        <Link to="/resources/faq" className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <p className="mt-3 text-slate-300">Answers to common questions on pricing, onboarding, integrations, and support.</p>
        </Link>
      </div>
    </MarketingLayout>
  );
}
