import React from 'react';
import { Link } from 'react-router-dom';

type MarketingLayoutProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  primaryCtaLabel?: string;
  primaryCtaTo?: string;
  secondaryCtaLabel?: string;
  secondaryCtaTo?: string;
};

export default function MarketingLayout({
  eyebrow,
  title,
  subtitle,
  children,
  primaryCtaLabel = 'Request a Demo',
  primaryCtaTo = '/company/contact',
  secondaryCtaLabel = 'Sign In',
  secondaryCtaTo = '/app/login'
}: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          {eyebrow ? <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-300">{eyebrow}</p> : null}
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={primaryCtaTo}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {primaryCtaLabel}
            </Link>
            <Link
              to={secondaryCtaTo}
              className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              {secondaryCtaLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">{children}</section>

      <section className="border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-blue-300">Next step</p>
            <h2 className="mt-2 text-2xl font-semibold">See how SkuFlow performs on your real data.</h2>
            <p className="mt-2 text-slate-300">Get a tailored walkthrough focused on your inventory and replenishment goals.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/company/contact" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500">
              Request Demo
            </Link>
            <Link to="/company/contact" className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
