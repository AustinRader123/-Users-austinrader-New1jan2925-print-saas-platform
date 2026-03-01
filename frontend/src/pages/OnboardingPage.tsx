import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import Breadcrumbs from '../components/Breadcrumbs';

export default function OnboardingPage() {
  const [storeId, setStoreId] = useState('default');
  const [step, setStep] = useState(1);
  const [dataJson, setDataJson] = useState('{\n  "business": {"name": "", "email": ""}\n}');
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const state = await apiClient.getOnboarding(storeId);
      setStep(Number(state?.step || 1));
      setCompleted(Boolean(state?.completed));
      setDataJson(JSON.stringify(state?.data || {}, null, 2));
    } catch (error) {
      toast.error((error as Error).message || 'Failed to load onboarding state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const save = async () => {
    try {
      const parsed = JSON.parse(dataJson || '{}');
      await apiClient.updateOnboarding({ storeId, step, data: parsed, completed });
      toast.success('Onboarding state saved');
      await load();
    } catch (error) {
      toast.error((error as Error).message || 'Invalid JSON or save failed');
    }
  };

  const complete = async () => {
    try {
      await apiClient.completeOnboarding(storeId);
      toast.success('Onboarding completed');
      await load();
    } catch (error) {
      toast.error((error as Error).message || 'Failed to complete onboarding');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div>
        <Breadcrumbs items={[{ to: '/app', label: 'Dashboard' }, { label: 'Storefront' }, { label: 'Onboarding' }]} />
      </div>
      <h1 className="text-2xl font-semibold mb-4">Onboarding Wizard</h1>

      {loading && (
        <div className="rounded border bg-white p-4 space-y-2" aria-label="onboarding-loading">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-40 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!loading && !completed && (
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600 mb-2">Continue setup to activate your storefront workflow.</p>
          <button className="btn btn-primary" onClick={save}>Continue setup</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Store ID" />
        <input className="input-base" type="number" min={1} max={7} value={step} onChange={(e) => setStep(Number(e.target.value || 1))} />
        <label className="text-sm flex items-center gap-2 border rounded px-3 py-2 bg-white">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
          Completed
        </label>
      </div>

      <textarea
        className="input-base w-full h-72 font-mono text-xs"
        value={dataJson}
        onChange={(e) => setDataJson(e.target.value)}
      />

      <div className="mt-4 flex gap-2">
        <button className="btn btn-primary" onClick={save}>Save Step</button>
        <button className="btn btn-secondary" onClick={complete}>Mark Complete</button>
      </div>
    </div>
  );
}
