import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { industries, seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function IndustriesPage() {
  usePageMeta(seoByPath['/industries'].title, seoByPath['/industries'].description);

  return (
    <MarketingLayout
      eyebrow="Built For"
      title="Designed for complex retail operations"
      subtitle="SkuFlow supports inventory and forecasting workflows across distinct retail operating models."
      secondaryCtaLabel="Request Demo"
      secondaryCtaTo="/company/contact"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {industries.map((industry) => (
          <Link key={industry.slug} to={`/industries/${industry.slug}`} className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-blue-600">
            <h2 className="text-xl font-semibold">{industry.name}</h2>
            <p className="mt-3 text-slate-300">{industry.summary}</p>
            <p className="mt-4 text-sm font-medium text-blue-300">Explore industry workflows →</p>
          </Link>
        ))}
      </div>
    </MarketingLayout>
  );
}
