import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { features } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function FeatureDetailPage() {
  const { featureSlug } = useParams();
  const feature = features.find((item) => item.slug === featureSlug);

  usePageMeta(feature ? `${feature.name} | SkuFlow Features` : 'Features | SkuFlow', feature?.summary ?? 'Explore SkuFlow feature depth.');

  if (!feature) {
    return <Navigate to="/features" replace />;
  }

  return (
    <MarketingLayout eyebrow="Features" title={feature.name} subtitle={feature.summary} secondaryCtaLabel="See All Features" secondaryCtaTo="/features">
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Business impact</h2>
          <ul className="mt-4 space-y-3 text-slate-300">
            {feature.benefits.map((benefit) => (
              <li key={benefit} className="rounded-lg border border-slate-800 bg-slate-950 p-3">{benefit}</li>
            ))}
          </ul>

          <h3 className="mt-8 text-xl font-semibold">Capabilities</h3>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
            {feature.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>

          <div className="mt-8 rounded-lg border border-blue-900 bg-blue-950/40 p-4 text-slate-200">
            Designed to replace disconnected manual workflows with operational guardrails and measurable execution.
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold">Who it's for</h3>
            <p className="mt-2 text-slate-300">{feature.whoFor}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="text-lg font-semibold">Explore next</h3>
            <div className="mt-3 flex flex-col gap-2 text-sm text-blue-300">
              {features.filter((item) => item.slug !== feature.slug).slice(0, 4).map((item) => (
                <Link key={item.slug} to={`/features/${item.slug}`} className="hover:text-blue-200">
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
