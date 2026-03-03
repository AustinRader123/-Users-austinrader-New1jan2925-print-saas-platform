import React from 'react';
import { Link } from 'react-router-dom';
import { pillars, seoByPath, solutions, subheadline, valueProp, features } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const outcomes = [
  {
    title: 'Reduce stockouts',
    body: 'Predict demand shifts and prioritize high-risk SKUs before service levels degrade.'
  },
  {
    title: 'Reduce overstock',
    body: 'Align buys to realistic sell-through and avoid capital tied up in excess inventory.'
  },
  {
    title: 'Improve cash flow',
    body: 'Balance service-level targets with leaner inventory positions across the network.'
  },
  {
    title: 'Faster decisions',
    body: 'Replace spreadsheet coordination with shared workflows, alerts, and clear ownership.'
  }
];

const faq = [
  {
    q: 'How quickly can we launch?',
    a: 'Most teams start with one category or region, connect core systems, and run a guided pilot in weeks.'
  },
  {
    q: 'Do we need to replace our ERP or WMS?',
    a: 'No. SkuFlow is designed to work with existing systems through integrations and API connectors.'
  },
  {
    q: 'How do you prove impact?',
    a: 'We baseline stockouts, excess, forecast quality, and planning cycle time, then track improvement over time.'
  }
];

export default function HomePage() {
  usePageMeta(seoByPath['/'].title, seoByPath['/'].description);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">AI forecasting + inventory optimization</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Forecast smarter. Replenish faster. Protect margin.</h1>
            <p className="mt-5 text-lg text-slate-300">{valueProp}</p>
            <p className="mt-3 text-slate-300">{subheadline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/company/contact" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
                Request a Demo
              </Link>
              <Link to="/app/login" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900">
                Sign In
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-blue-300">Product UI Preview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Forecast Accuracy</p>
                <p className="mt-2 text-2xl font-semibold">+14%</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Stockout Rate</p>
                <p className="mt-2 text-2xl font-semibold">-27%</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Excess Inventory</p>
                <p className="mt-2 text-2xl font-semibold">-18%</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Planning Cycle</p>
                <p className="mt-2 text-2xl font-semibold">Same-day</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-800 bg-slate-900/60">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Trusted by planning, merchandising, and operations teams</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300 sm:grid-cols-4">
            <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">Retail Group One</div>
            <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">Urban Apparel Co.</div>
            <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">Northstar Specialty</div>
            <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2">OmniGoods Brand</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Platform outcomes</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {outcomes.map((item) => (
            <div key={item.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold">Core solutions</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {solutions.map((solution) => (
              <Link key={solution.slug} to={`/solutions/${solution.slug}`} className="rounded-xl border border-slate-800 bg-slate-950 p-5 hover:border-blue-600">
                <h3 className="text-xl font-semibold">{solution.name}</h3>
                <p className="mt-2 text-slate-300">{solution.summary}</p>
                <p className="mt-3 text-sm font-medium text-blue-300">Learn more →</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Feature breadth</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.slice(0, 12).map((feature) => (
            <Link key={feature.slug} to={`/features/${feature.slug}`} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 hover:border-blue-600">
              {feature.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold">Connect data</h3>
              <p className="mt-2 text-slate-300">Ingest POS, ERP, WMS, and commerce data into one planning model.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold">Forecast & optimize</h3>
              <p className="mt-2 text-slate-300">Generate demand forecasts and replenishment recommendations with policy controls.</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold">Act with workflows</h3>
              <p className="mt-2 text-slate-300">Execute through alerts, approvals, and role-based operational ownership.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Integrations</h2>
        <p className="mt-3 text-slate-300">Connect your existing stack across POS, ERP, WMS, eCommerce, procurement, and BI systems.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {['POS Platforms', 'ERP Systems', 'WMS Platforms', 'Commerce Platforms', 'Data Warehouses'].map((item) => (
            <div key={item} className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold">Proof from teams like yours</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <blockquote className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-300">“Stockout rate dropped 27% in two quarters after rolling out exception-first replenishment.”</p>
              <footer className="mt-3 text-sm text-blue-300">VP Operations, Specialty Retailer</footer>
            </blockquote>
            <blockquote className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-300">“Excess inventory declined 18% while our in-stock performance improved.”</p>
              <footer className="mt-3 text-sm text-blue-300">Director of Planning, Apparel Brand</footer>
            </blockquote>
            <blockquote className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <p className="text-slate-300">“Planning shifted from weekly reaction to daily operational control.”</p>
              <footer className="mt-3 text-sm text-blue-300">COO, Multi-location Retail Group</footer>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Pricing preview</h2>
        <p className="mt-3 text-slate-300">Choose the plan that matches your operating complexity and growth stage.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { name: 'Starter', text: 'Core forecasting, inventory dashboards, and alerts for lean teams.' },
            { name: 'Pro', text: 'Advanced replenishment rules, integrations, and deeper KPI analytics.' },
            { name: 'Enterprise', text: 'SSO, governance controls, dedicated onboarding, and premium support.' }
          ].map((plan) => (
            <div key={plan.name} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-slate-300">{plan.text}</p>
              <Link to="/pricing" className="mt-4 inline-block text-sm font-semibold text-blue-300 hover:text-blue-200">
                Compare plans →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {faq.map((item) => (
            <div key={item.q} className="rounded-lg border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold">{item.q}</h3>
              <p className="mt-2 text-slate-300">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-800 bg-gradient-to-r from-slate-900 to-blue-950">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-300">Ready to improve retail performance?</p>
            <h2 className="mt-2 text-2xl font-semibold">Book a tailored SkuFlow demo.</h2>
          </div>
          <div className="flex gap-3">
            <Link to="/company/contact" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
            <Link to="/company/contact" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900">
              Contact
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold">Design system foundation</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Typography</h3>
            <p className="mt-2 text-sm text-slate-300">H1 48/56, H2 36/44, H3 24/32, Body 16/26, Caption 12/18.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Spacing</h3>
            <p className="mt-2 text-sm text-slate-300">4px base scale with 16/24/32/48/64 section rhythm for scannability.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Buttons</h3>
            <p className="mt-2 text-sm text-slate-300">Primary: filled blue. Secondary: bordered dark. Minimum tap target 44px.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="font-semibold">Cards</h3>
            <p className="mt-2 text-sm text-slate-300">12–16px radius, dark neutral surface, clear heading + one actionable next step.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
