import React from 'react';
import MarketingLayout from '../components/marketing/MarketingLayout';
import { seoByPath } from '../content/marketingContent';
import { usePageMeta } from '../hooks/usePageMeta';

const docsSections = [
  {
    title: 'Getting Started',
    items: ['Connect your first data source', 'Configure locations and SKU hierarchy', 'Set forecasting cadence']
  },
  {
    title: 'Planning Workflows',
    items: ['Forecast model configuration', 'Replenishment policy setup', 'Exception queue triage']
  },
  {
    title: 'Integrations & API',
    items: ['POS/ERP/WMS connectors', 'API authentication', 'Webhooks and event routing']
  },
  {
    title: 'Administration',
    items: ['Roles and permissions', 'Audit logs', 'Security and SSO']
  }
];

export default function DocsPage() {
  usePageMeta(seoByPath['/resources/docs'].title, seoByPath['/resources/docs'].description);

  return (
    <MarketingLayout
      eyebrow="Resources"
      title="SkuFlow Documentation"
      subtitle="Reference guides for onboarding, operations, integrations, and administration."
      secondaryCtaLabel="FAQ"
      secondaryCtaTo="/resources/faq"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {docsSections.map((section) => (
          <article key={section.title} className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">{section.title}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-slate-300">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </MarketingLayout>
  );
}
