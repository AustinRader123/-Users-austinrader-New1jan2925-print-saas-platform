import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const posts = [
  {
    title: 'How to reduce stockouts without inflating inventory',
    excerpt: 'A practical framework for balancing service levels and working capital using exception-first workflows.',
    tag: 'Inventory Optimization'
  },
  {
    title: 'Forecasting for seasonal demand spikes',
    excerpt: 'How planning teams incorporate events and trend shifts without overreacting to noise.',
    tag: 'Demand Forecasting'
  },
  {
    title: 'From weekly reporting to daily operational control',
    excerpt: 'How shared KPI workflows improve decision speed across planning, merchandising, and operations.',
    tag: 'Operations'
  }
];

export default function BlogPage() {
  usePageMeta(seoByPath['/resources/blog'].title, seoByPath['/resources/blog'].description);

  return (
    <MarketingLayout eyebrow="Resources" title="SkuFlow Blog" subtitle="Operational insights for forecasting, replenishment, and inventory execution." secondaryCtaLabel="View Guides" secondaryCtaTo="/resources/guides">
      <div className="grid gap-5 md:grid-cols-3">
        {posts.map((post) => (
          <article key={post.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs uppercase tracking-[0.15em] text-blue-300">{post.tag}</p>
            <h2 className="mt-3 text-xl font-semibold">{post.title}</h2>
            <p className="mt-3 text-slate-300">{post.excerpt}</p>
            <button className="mt-5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              Read article
            </button>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
