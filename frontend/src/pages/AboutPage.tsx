import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function AboutPage() {
  usePageMeta(seoByPath['/company/about'].title, seoByPath['/company/about'].description);

  return (
    <MarketingLayout
      eyebrow="Company"
      title="About SkuFlow"
      subtitle="We help retail teams replace fragmented planning with connected forecasting and inventory execution."
      secondaryCtaLabel="Contact Us"
      secondaryCtaTo="/company/contact"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Our mission</h2>
          <p className="mt-4 text-slate-300">
            SkuFlow exists to help retail operators make better inventory decisions faster. We believe forecasting and
            replenishment should be practical, measurable, and embedded in daily workflows.
          </p>

          <h3 className="mt-8 text-xl font-semibold">How we work</h3>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-300">
            <li>Operational clarity over buzzwords</li>
            <li>Decision speed with governance</li>
            <li>Measurable outcomes over vanity metrics</li>
            <li>Cross-functional alignment across planning, merchandising, and operations</li>
          </ul>
        </section>

        <aside className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-semibold">Platform focus</h3>
          <ul className="mt-3 space-y-2 text-slate-300">
            <li>Demand forecasting</li>
            <li>Inventory optimization</li>
            <li>Supply chain visibility</li>
            <li>Scenario planning</li>
            <li>Executive analytics</li>
          </ul>
        </aside>
      </div>
    </MarketingLayout>
  );
}
