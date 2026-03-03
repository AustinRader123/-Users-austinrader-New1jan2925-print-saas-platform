import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const faqs = [
  {
    q: 'How does SkuFlow improve forecast accuracy?',
    a: 'SkuFlow combines model selection, trend detection, and location-level diagnostics so teams can tune forecasts by segment.'
  },
  {
    q: 'Which systems can we integrate?',
    a: 'You can integrate POS, ERP, WMS, eCommerce, and warehouse data sources through connectors and API endpoints.'
  },
  {
    q: 'Which plan should we choose?',
    a: 'Starter is best for small teams, Pro adds advanced automation and integrations, and Enterprise adds governance, SSO, and dedicated onboarding.'
  },
  {
    q: 'Can I use SkuFlow with existing planning tools?',
    a: 'Yes. SkuFlow is designed to augment your current stack and route actions back to operational systems.'
  },
  {
    q: 'What support is available?',
    a: 'All plans include support; Pro and Enterprise include higher-priority response and deeper implementation guidance.'
  }
];

export default function FAQPage() {
  usePageMeta(seoByPath['/resources/faq'].title, seoByPath['/resources/faq'].description);

  return (
    <MarketingLayout
      eyebrow="Resources"
      title="Frequently Asked Questions"
      subtitle="Quick answers on onboarding, pricing, integrations, and day-to-day operations."
      secondaryCtaLabel="Docs"
      secondaryCtaTo="/resources/docs"
    >
      <div className="space-y-3">
        {faqs.map((item) => (
          <article key={item.q} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">{item.q}</h2>
            <p className="mt-3 text-slate-300">{item.a}</p>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
