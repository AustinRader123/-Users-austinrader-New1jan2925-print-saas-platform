import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath, solutions } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function SolutionsPage() {
  usePageMeta(seoByPath['/solutions'].title, seoByPath['/solutions'].description);

  return (
    <MarketingLayout
      eyebrow="Solutions"
      title="Solution workflows built for retail operators"
      subtitle="From demand prediction to replenishment execution, SkuFlow delivers practical, measurable improvements across the retail operating model."
      secondaryCtaLabel="View Features"
      secondaryCtaTo="/features"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {solutions.map((solution) => (
          <article key={solution.slug} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">{solution.name}</h2>
            <p className="mt-3 text-slate-300">{solution.summary}</p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {solution.benefits.slice(0, 3).map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
            <Link to={`/solutions/${solution.slug}`} className="mt-5 inline-block text-sm font-semibold text-blue-300 hover:text-blue-200">
              Explore solution →
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-blue-900 bg-blue-950/30 p-6 text-slate-200">
        Compared to disconnected manual planning, SkuFlow gives teams a connected workflow for forecasting, inventory optimization, and execution.
      </div>
    </MarketingLayout>
  );
}
