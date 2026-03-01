import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import Breadcrumbs from '../components/Breadcrumbs';

const DEFAULT_THEME = {
  colors: {
    primary: '#2563EB',
    secondary: '#0F172A',
    accent: '#22C55E',
    background: '#FFFFFF',
    text: '#111827',
  },
  typography: {
    fontPreset: 'INTER',
  },
  layout: {
    heroStyle: 'STANDARD',
    showFeaturedCollections: true,
  },
  hero: {
    title: 'Welcome to our store',
    subtitle: 'Shop our latest collections',
    ctaText: 'Shop now',
    ctaHref: '/store/products',
    imageUrl: '',
  },
  banner: {
    enabled: false,
    text: '',
  },
  footerLinks: [],
  featuredCollectionIds: [],
};

export default function StorefrontThemePage() {
  const [storeId, setStoreId] = useState('default');
  const [storefrontId, setStorefrontId] = useState('');
  const [json, setJson] = useState(JSON.stringify(DEFAULT_THEME, null, 2));
  const [loading, setLoading] = useState(true);
  const [previewToken, setPreviewToken] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getTheme(storeId);
      if (data?.draft?.config) {
        setJson(JSON.stringify(data.draft.config, null, 2));
      } else if (data?.published?.config) {
        setJson(JSON.stringify(data.published.config, null, 2));
      }
      if (data?.draft?.storefrontId) setStorefrontId(data.draft.storefrontId);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to load theme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [storeId]);

  const saveDraft = async () => {
    try {
      const config = JSON.parse(json || '{}');
      await apiClient.saveThemeDraft({ storeId, storefrontId: storefrontId || undefined, config });
      toast.success('Theme draft saved');
      await load();
    } catch (error) {
      toast.error((error as Error).message || 'Invalid JSON or save failed');
    }
  };

  const publish = async () => {
    try {
      await apiClient.publishTheme(storeId);
      toast.success('Theme published');
      await load();
    } catch (error) {
      toast.error((error as Error).message || 'Publish failed');
    }
  };

  const createPreview = async () => {
    try {
      const data = await apiClient.createThemePreviewToken(storeId, 15);
      setPreviewToken(data?.token || '');
      toast.success('Preview token created');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to create preview token');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Breadcrumbs items={[{ to: '/app', label: 'Dashboard' }, { label: 'Storefront' }, { label: 'Theme' }]} />
      <h1 className="text-2xl font-semibold mb-4">Storefront Theme</h1>

      {loading && (
        <div className="rounded border bg-white p-4 space-y-2" aria-label="theme-loading">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-40 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!loading && !previewToken && (
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-slate-600 mb-2">Publish your theme to apply branding on the storefront.</p>
          <button className="btn btn-primary" onClick={publish}>Publish your theme</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Store ID" />
        <input className="input-base" value={storefrontId} onChange={(e) => setStorefrontId(e.target.value)} placeholder="Storefront ID (optional)" />
      </div>

      <textarea className="input-base w-full h-72 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={saveDraft}>Save Draft</button>
        <button className="btn btn-secondary" onClick={publish}>Publish Theme</button>
        <button className="btn btn-secondary" onClick={createPreview}>Create Preview Token</button>
      </div>

      {previewToken && (
        <div className="mt-4 border rounded p-3 bg-white text-sm">
          <div className="font-medium mb-1">Preview URL</div>
          <div className="break-all">/api/public/theme-preview?token={previewToken}</div>
        </div>
      )}
    </div>
  );
}
