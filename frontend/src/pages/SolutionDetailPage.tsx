import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { solutions } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function SolutionDetailPage() {
  const { solutionSlug } = useParams();
  const solution = solutions.find((item) => item.slug === solutionSlug);

  usePageMeta(solution ? `${solution.name} | SkuFlow` : 'Solutions | SkuFlow', solution?.summary ?? 'Explore SkuFlow solution workflows.');

  if (!solution) {
    return <Navigate to="/solutions" replace />;
  }

  return (
    <MarketingLayout eyebrow="Solutions" title={solution.name} subtitle={solution.summary} secondaryCtaLabel="See All Solutions" secondaryCtaTo="/solutions">
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Benefits</h2>
          <ul className="mt-4 space-y-3 text-slate-300">
            {solution.benefits.map((benefit) => (
              <li key={benefit} className="rounded-lg border border-slate-800 bg-slate-950 p-3">{benefit}</li>
            ))}
          </ul>

          <h3 className="mt-8 text-xl font-semibold">Feature depth</h3>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
            {solution.featureDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>

          <div className="mt-8 rounded-lg border border-blue-900 bg-blue-950/40 p-4 text-slate-200">
            Compared to spreadsheet-heavy workflows, this gives teams a repeatable process for forecast-to-action execution.
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold">Who it's for</h3>
            <p className="mt-2 text-slate-300">{solution.whoFor}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold">Explore next</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-blue-300">
              {solutions.filter((item) => item.slug !== solution.slug).slice(0, 4).map((item) => (
                <Link key={item.slug} to={`/solutions/${item.slug}`} className="hover:text-blue-200">
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </MarketingLayout>
  );
}
