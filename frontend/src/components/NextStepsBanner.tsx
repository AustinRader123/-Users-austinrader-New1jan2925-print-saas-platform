import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function NextStepsBanner() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [flags, setFlags] = useState<{ onboardingIncomplete: boolean; themeUnpublished: boolean; emailProviderDisabled: boolean } | null>(null);

  const dismissalKey = useMemo(() => `next-steps-dismissed:${user?.tenantId || 'tenant'}:${user?.id || 'anon'}`, [user?.tenantId, user?.id]);

  useEffect(() => {
    const stored = localStorage.getItem(dismissalKey);
    setHidden(stored === '1');
  }, [dismissalKey]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getOnboardingNextSteps('default');
        if (!mounted) return;
        setFlags({
          onboardingIncomplete: Boolean(data?.onboardingIncomplete),
          themeUnpublished: Boolean(data?.themeUnpublished),
          emailProviderDisabled: Boolean(data?.emailProviderDisabled),
        });
      } catch {
        if (!mounted) return;
        setFlags(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const steps = [
    flags?.onboardingIncomplete ? { label: 'Complete onboarding', href: '/dashboard/onboarding' } : null,
    flags?.themeUnpublished ? { label: 'Publish your theme', href: '/dashboard/storefront/theme' } : null,
    flags?.emailProviderDisabled ? { label: 'Enable email settings', href: '/dashboard/settings/email' } : null,
  ].filter(Boolean) as Array<{ label: string; href: string }>;

  if (loading) {
    return (
      <div className="rounded border bg-white p-4 mb-4" aria-label="next-steps-loading">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (hidden || steps.length === 0) return null;

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-blue-900 mb-2">Next steps</h2>
          <ul className="space-y-1 text-sm text-blue-900">
            {steps.slice(0, 3).map((item) => (
              <li key={item.href}>
                • <Link className="underline" to={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            localStorage.setItem(dismissalKey, '1');
            setHidden(true);
            toast.success('Next steps hidden');
          }}
        >
          Hide
        </button>
      </div>
    </div>
  );
}
