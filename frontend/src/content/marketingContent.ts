export type SolutionItem = {
  slug: string;
  name: string;
  summary: string;
  benefits: string[];
  featureDetails: string[];
  whoFor: string;
};

export type FeatureItem = {
  slug: string;
  name: string;
  summary: string;
  benefits: string[];
  details: string[];
  whoFor: string;
};

export type IndustryItem = {
  slug: string;
  name: string;
  summary: string;
  challenges: string[];
  workflows: string[];
  outcomes: string[];
};

export const valueProp = 'SkuFlow helps multi-location retailers forecast demand and optimize replenishment to grow revenue with less inventory risk.';

export const subheadline =
  'Built for retail planning, merchandising, and operations teams that need fewer stockouts, lower overstock, and faster decisions across stores, channels, and suppliers.';

export const pillars = [
  {
    title: 'Forecasts tied to execution',
    body: 'Every forecast can flow directly into reorder and allocation workflows instead of staying inside dashboards.'
  },
  {
    title: 'Exception-first operations',
    body: 'Teams focus on the few SKUs and locations that need immediate action, not broad manual reviews.'
  },
  {
    title: 'Network-wide visibility',
    body: 'See demand, inventory, in-transit supply, and supplier risk in one operational system.'
  },
  {
    title: 'Scenario confidence',
    body: 'Run what-if analysis before changing service levels, buys, or replenishment policies.'
  },
  {
    title: 'Role-specific accountability',
    body: 'Executives, planners, and operators get tailored views with shared KPIs and auditability.'
  }
];

export const solutions: SolutionItem[] = [
  {
    slug: 'forecasting',
    name: 'Forecasting',
    summary: 'Generate reliable SKU-location forecasts that drive better purchase and replenishment decisions.',
    benefits: ['Improve in-stock availability', 'Reduce reactive expediting', 'Increase forecast confidence by segment'],
    featureDetails: [
      'Model blending for stable baseline forecasts',
      'Trend and seasonality detection',
      'New-item forecasting support',
      'Forecast quality reporting by category and horizon'
    ],
    whoFor: 'Demand planners, category managers, and operations teams managing complex assortments.'
  },
  {
    slug: 'inventory-optimization',
    name: 'Inventory Optimization',
    summary: 'Convert demand insight into replenishment actions that balance service levels and working capital.',
    benefits: ['Reduce stockouts and excess', 'Standardize replenishment logic', 'Lower manual review overhead'],
    featureDetails: [
      'Dynamic reorder points by SKU-location',
      'Policy-based safety stock targets',
      'Order quantity recommendations',
      'Approval workflows for critical exceptions'
    ],
    whoFor: 'Replenishment teams, buyers, and finance leaders responsible for inventory efficiency.'
  },
  {
    slug: 'supply-chain-visibility',
    name: 'Supply Chain Visibility',
    summary: 'Monitor supplier and inbound flow risk before service-level issues affect stores and customers.',
    benefits: ['Detect lead-time risk early', 'Improve supplier accountability', 'Reduce surprise shortages'],
    featureDetails: [
      'PO and inbound status tracking',
      'Supplier performance scorecards',
      'ETA risk and delay alerts',
      'Network-level inventory flow views'
    ],
    whoFor: 'Supply chain, purchasing, and operations teams coordinating inbound inventory.'
  },
  {
    slug: 'analytics-reporting',
    name: 'Analytics & Reporting',
    summary: 'Give every team a shared KPI view of forecast quality, stock health, and execution performance.',
    benefits: ['Align teams around one source of truth', 'Surface root-cause trends faster', 'Improve decision quality in weekly reviews'],
    featureDetails: [
      'Role-based dashboard views',
      'Forecast accuracy and bias reporting',
      'Stockout and overstock trend drill-downs',
      'Executive and operator scorecards'
    ],
    whoFor: 'Executives, planners, and operations leads driving performance reviews.'
  },
  {
    slug: 'alerts-automation',
    name: 'Alerts & Automation',
    summary: 'Detect risk in real time and route recommended actions to the right owner automatically.',
    benefits: ['Reduce blind spots', 'Speed up issue resolution', 'Standardize response playbooks'],
    featureDetails: [
      'Real-time anomaly detection',
      'Exception queues and prioritization',
      'Action recommendations with approvals',
      'Escalation and SLA tracking'
    ],
    whoFor: 'Operations teams that need fast, consistent action when risk appears.'
  }
];

export const features: FeatureItem[] = [
  {
    slug: 'forecast-models',
    name: 'Forecast Models',
    summary: 'Retail-ready models built to handle volatility, seasonality, and trend changes.',
    benefits: ['Improve forecast reliability', 'Detect shifts early', 'Trust outputs with diagnostics'],
    details: ['Multi-model selection', 'Seasonality/event adjustments', 'Confidence ranges', 'Accuracy diagnostics'],
    whoFor: 'Planning and analytics teams that need transparent forecasting.'
  },
  {
    slug: 'replenishment-rules',
    name: 'Replenishment Rules',
    summary: 'Automate reorder triggers using demand variability and lead-time risk.',
    benefits: ['Reduce stock gaps', 'Lower excess inventory', 'Scale policy consistency'],
    details: ['Dynamic ROP updates', 'Safety stock controls', 'Order recommendations', 'Override audit trail'],
    whoFor: 'Replenishment and purchasing teams.'
  },
  {
    slug: 'exception-management',
    name: 'Exception Management',
    summary: 'Prioritize the inventory and demand issues that need immediate action.',
    benefits: ['Focus teams on impact', 'Shorten response time', 'Reduce planning fire drills'],
    details: ['Risk scoring', 'Workflow routing', 'Escalation rules', 'SLA tracking'],
    whoFor: 'Operations managers and planners handling high SKU volume.'
  },
  {
    slug: 'multi-location-inventory',
    name: 'Multi-location Inventory',
    summary: 'Coordinate inventory decisions across stores, warehouses, and channels.',
    benefits: ['Improve network allocation', 'Reduce location-level imbalances', 'Increase service consistency'],
    details: ['Location-level visibility', 'Transfer-aware planning', 'Channel-aware inventory view', 'Local demand overlays'],
    whoFor: 'Retailers operating across multiple stock nodes.'
  },
  {
    slug: 'notifications',
    name: 'Notifications',
    summary: 'Deliver targeted alerts and digests to keep teams aligned on priority risks and actions.',
    benefits: ['Reduce blind spots', 'Increase follow-through', 'Keep stakeholders informed'],
    details: ['Channel and severity routing', 'Digest and instant modes', 'Role-aware subscriptions', 'Escalation workflows'],
    whoFor: 'Teams coordinating fast action across functions.'
  },
  {
    slug: 'kpi-dashboards',
    name: 'KPI Dashboards',
    summary: 'Track forecast, inventory, and cash metrics with role-specific clarity.',
    benefits: ['Shared source of truth', 'Faster weekly reviews', 'Stronger accountability'],
    details: ['Executive scorecards', 'Category/location trends', 'Alert aging', 'Forecast performance views'],
    whoFor: 'Executives, managers, and analysts.'
  },
  {
    slug: 'roles-permissions',
    name: 'Roles & Permissions',
    summary: 'Control access and approvals across critical inventory workflows.',
    benefits: ['Safer operations', 'Clear ownership', 'Audit-ready controls'],
    details: ['Role-based access', 'Approval layers', 'Action history', 'Policy enforcement'],
    whoFor: 'Admin and operations leadership.'
  },
  {
    slug: 'integrations',
    name: 'Integrations / Data Connectors',
    summary: 'Connect POS, ERP, WMS, and commerce systems into one operational model.',
    benefits: ['Faster time-to-value', 'Cleaner planning data', 'No rip-and-replace'],
    details: ['Connector framework', 'Scheduled syncs', 'Data health checks', 'System mapping controls'],
    whoFor: 'Operations, IT, and analytics teams.'
  },
  {
    slug: 'api',
    name: 'API',
    summary: 'Extend SkuFlow workflows with secure APIs and integration endpoints.',
    benefits: ['Automate repetitive tasks', 'Integrate with internal tools', 'Enable advanced workflows'],
    details: ['REST endpoints', 'Authentication controls', 'Webhook events', 'Developer docs'],
    whoFor: 'Engineering and technical operations teams.'
  },
  {
    slug: 'security',
    name: 'Security',
    summary: 'Protect sensitive operational and commercial data with enterprise-grade controls.',
    benefits: ['Reduce security risk', 'Support compliance reviews', 'Harden account access'],
    details: ['SAML/SSO readiness', 'Encryption in transit and at rest', 'Session and token controls', 'Least-privilege defaults'],
    whoFor: 'Security, IT, and admin teams.'
  },
  {
    slug: 'audit-logs',
    name: 'Audit Logs',
    summary: 'Track who changed what, when, and why across planning and execution workflows.',
    benefits: ['Improve accountability', 'Accelerate investigations', 'Support controls and audits'],
    details: ['Immutable action history', 'Change event filtering', 'Export-ready logs', 'User and role attribution'],
    whoFor: 'Operations leaders and compliance stakeholders.'
  },
  {
    slug: 'data-import',
    name: 'Data Import',
    summary: 'Load product, inventory, and planning data quickly with validation and retry support.',
    benefits: ['Faster onboarding', 'Fewer data errors', 'Higher planning confidence'],
    details: ['CSV and connector imports', 'Schema validation', 'Error reporting and retries', 'Import activity timeline'],
    whoFor: 'Operators and analysts preparing source data.'
  }
];

export const industries: IndustryItem[] = [
  {
    slug: 'apparel',
    name: 'Apparel',
    summary: 'Manage size-color complexity and seasonal demand with stronger planning control.',
    challenges: ['Variant complexity', 'Frequent seasonal shifts', 'Markdown pressure from overstock'],
    workflows: ['Style-size-color forecasting', 'Seasonal replenishment policies', 'Sell-through visibility by region'],
    outcomes: ['Lower excess by variant', 'Higher in-stock for core styles', 'Fewer end-of-season markdowns']
  },
  {
    slug: 'specialty-retail',
    name: 'Specialty Retail',
    summary: 'Coordinate diverse assortments and local demand patterns without planning sprawl.',
    challenges: ['Broad catalog management', 'Local demand variability', 'Fragmented planning tools'],
    workflows: ['Category-level forecasting', 'Location-specific replenishment', 'Exception-based workflow routing'],
    outcomes: ['Faster planning cycles', 'Improved location fill rates', 'Reduced manual triage']
  },
  {
    slug: 'grocery-cpg',
    name: 'Grocery / CPG',
    summary: 'Improve high-frequency replenishment and shelf availability under tight margins.',
    challenges: ['High velocity demand', 'Service-level pressure', 'Lead-time and inbound volatility'],
    workflows: ['Short-horizon demand forecasting', 'Fast-cycle replenishment', 'Supplier variance monitoring'],
    outcomes: ['Higher shelf availability', 'Reduced spoilage/excess', 'More predictable replenishment execution']
  },
  {
    slug: 'ecommerce-first-brands',
    name: 'eCommerce-first Brands',
    summary: 'Align digital demand volatility with inventory and buying decisions across channels.',
    challenges: ['Campaign-driven spikes', 'Channel inventory conflicts', 'Rapid assortment change'],
    workflows: ['Campaign-aware forecasting', 'Channel-level inventory controls', 'What-if planning for growth moves'],
    outcomes: ['Lower stockout during spikes', 'Stronger cash discipline', 'Better cross-channel fulfillment']
  }
];

export const seoByPath: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'SkuFlow | Forecasting & Inventory Optimization for Retail',
    description: 'Improve in-stock performance and cash flow with demand forecasting, replenishment automation, and operational inventory workflows.'
  },
  '/solutions': {
    title: 'Retail Solutions | SkuFlow',
    description: 'Explore forecasting, replenishment, supply chain visibility, and merchandising execution solutions for modern retail teams.'
  },
  '/features': {
    title: 'Platform Features | SkuFlow',
    description: 'Explore forecast models, reorder automation, alerts, dashboards, integrations, and API capabilities.'
  },
  '/industries': {
    title: 'Built for Retail Teams | SkuFlow',
    description: 'See how SkuFlow supports apparel, specialty retail, grocery/CPG, and eCommerce-first brands.'
  },
  '/pricing': {
    title: 'SkuFlow Pricing',
    description: 'Flexible platform plans for teams scaling forecasting and inventory execution workflows.'
  },
  '/resources': {
    title: 'Retail Operations Resources | SkuFlow',
    description: 'Explore blog insights, customer case studies, and practical guides for forecasting and inventory operations.'
  },
  '/resources/docs': {
    title: 'SkuFlow Documentation',
    description: 'Product documentation for setup, integrations, forecasting workflows, and administration.'
  },
  '/resources/faq': {
    title: 'SkuFlow FAQ',
    description: 'Answers to common questions about onboarding, pricing, features, integrations, and support.'
  },
  '/resources/blog': {
    title: 'Retail Operations Blog | SkuFlow',
    description: 'Insights for retail planning, demand forecasting, and inventory performance improvement.'
  },
  '/resources/case-studies': {
    title: 'Customer Case Studies | SkuFlow',
    description: 'Read measurable outcomes from teams improving stock availability and reducing excess inventory.'
  },
  '/resources/guides': {
    title: 'Retail Planning Guides | SkuFlow',
    description: 'Download practical playbooks for forecasting, replenishment, and operations execution.'
  },
  '/company/about': {
    title: 'About SkuFlow',
    description: 'Learn SkuFlow’s mission to modernize retail forecasting and inventory decision-making.'
  },
  '/company/contact': {
    title: 'Contact SkuFlow',
    description: 'Talk to sales, support, or partnerships and get a tailored platform walkthrough.'
  }
};
