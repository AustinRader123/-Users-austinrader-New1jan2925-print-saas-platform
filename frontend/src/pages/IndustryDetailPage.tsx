import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { industries } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function IndustryDetailPage() {
  const { industrySlug } = useParams();
  const industry = industries.find((item) => item.slug === industrySlug);

  usePageMeta(industry ? `${industry.name} | SkuFlow` : 'Built For | SkuFlow', industry?.summary ?? 'Explore SkuFlow industry solutions.');

  if (!industry) {
    return <Navigate to="/industries" replace />;
  }

  return (
    <MarketingLayout eyebrow="Built For" title={industry.name} subtitle={industry.summary} secondaryCtaLabel="See All Industries" secondaryCtaTo="/industries">
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Common challenges</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
              {industry.challenges.map((challenge) => (
                <li key={challenge}>{challenge}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-semibold">Recommended workflows</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
              {industry.workflows.map((workflow) => (
                <li key={workflow}>{workflow}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-blue-900 bg-blue-950/40 p-4 text-slate-200">
            Move beyond disconnected planning files with one workflow model for demand, inventory, and execution.
          </div>
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold">Typical outcomes</h3>
          <ul className="mt-3 space-y-2 text-slate-300">
            {industry.outcomes.map((outcome) => (
              <li key={outcome} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                {outcome}
              </li>
            ))}
          </ul>
          <Link to="/company/contact" className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">
            Request Demo
          </Link>
        </aside>
      </div>
    </MarketingLayout>
  );
}
