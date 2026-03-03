import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

export default function ContactPage() {
  usePageMeta(seoByPath['/company/contact'].title, seoByPath['/company/contact'].description);

  return (
    <MarketingLayout
      eyebrow="Company"
      title="Talk with SkuFlow"
      subtitle="Share your planning and inventory goals and we’ll map a rollout plan around your systems and business targets."
      secondaryCtaLabel="Sign In"
      secondaryCtaTo="/app/login"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Sales</h2>
            <p className="mt-2 text-sm text-slate-300">Platform walkthrough, use-case fit, and ROI discussion.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Support</h2>
            <p className="mt-2 text-sm text-slate-300">For active customers needing technical or workflow support.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="font-semibold">Partnerships</h2>
            <p className="mt-2 text-sm text-slate-300">Integration partners and strategic collaboration opportunities.</p>
          </div>
        </aside>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Request a tailored walkthrough</h2>
          <p className="mt-2 text-slate-300">Include your systems, SKU volume, and primary operational goals.</p>
          <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Full name" />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Work email" />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Company" />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" placeholder="Role" />
            <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 sm:col-span-2" placeholder="Current systems (POS, ERP, WMS, Commerce)" />
            <textarea className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 sm:col-span-2" rows={4} placeholder="What outcomes are most important?" />
            <button type="button" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500">Submit request</button>
          </form>

          <div className="mt-6 rounded-lg border border-blue-900 bg-blue-950/40 p-4 text-sm text-slate-200">
            Typical response times: Sales within 1 business day, support based on plan SLAs.
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
