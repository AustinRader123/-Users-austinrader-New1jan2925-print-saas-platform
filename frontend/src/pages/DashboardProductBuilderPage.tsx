import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

function defaultLocations() {
  return JSON.stringify([
    {
      key: 'front',
      label: 'Front',
      bounds: { maxWidth: 900, maxHeight: 900 },
      allowedLayers: ['TEXT', 'ARTWORK', 'UPLOAD'],
    },
  ], null, 2);
}

export default function DashboardProductBuilderPage() {
  const { productId = '' } = useParams();
  const location = useLocation();
  const initialStoreId = React.useMemo(() => new URLSearchParams(location.search).get('storeId') || 'default', [location.search]);

  const [storeId, setStoreId] = React.useState(initialStoreId);
  const [enabled, setEnabled] = React.useState(true);
  const [locationsJson, setLocationsJson] = React.useState(defaultLocations());
  const [rulesJson, setRulesJson] = React.useState('{}');
  const [schemasJson, setSchemasJson] = React.useState('[]');
  const [categories, setCategories] = React.useState<any[]>([]);
  const [profileId, setProfileId] = React.useState<string>('');
  const [categoryName, setCategoryName] = React.useState('');
  const [categorySlug, setCategorySlug] = React.useState('');
  const [assetFile, setAssetFile] = React.useState<File | null>(null);
  const [assetName, setAssetName] = React.useState('');
  const [assetTags, setAssetTags] = React.useState('');
  const [assetCategoryId, setAssetCategoryId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const load = React.useCallback(async () => {
    if (!productId || !storeId) return;
    setLoading(true);
    setMessage('');
    try {
      const data = await apiClient.getProductCustomizerConfig(storeId, productId);
      if (data) {
        setEnabled(Boolean(data.enabled));
        setLocationsJson(JSON.stringify(data.locations || [], null, 2));
        setRulesJson(JSON.stringify(data.rules || {}, null, 2));
        setSchemasJson(JSON.stringify(data.personalizationSchemas || [], null, 2));
        setProfileId(String(data.id || ''));
      }
      const cats = await apiClient.listCustomizerArtworkCategories(storeId, data?.id || undefined);
      setCategories(Array.isArray(cats) ? cats : []);
      if (cats?.[0]?.id) setAssetCategoryId(String(cats[0].id));
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to load product builder');
    } finally {
      setLoading(false);
    }
  }, [productId, storeId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async () => {
    try {
      const locations = JSON.parse(locationsJson || '[]');
      const rules = JSON.parse(rulesJson || '{}');
      const saved = await apiClient.saveProductCustomizerProfile(productId, {
        storeId,
        enabled,
        locations,
        rules,
      });
      setProfileId(String(saved?.id || profileId));
      setMessage('Saved product customization profile');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to save profile');
    }
  };

  const saveSchemas = async () => {
    try {
      const schemas = JSON.parse(schemasJson || '[]');
      await apiClient.saveProductPersonalizationSchemas(productId, { storeId, schemas });
      setMessage('Saved personalization schema rules');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to save schema');
    }
  };

  const createCategory = async () => {
    if (!categoryName.trim() || !categorySlug.trim()) return;
    try {
      await apiClient.saveCustomizerArtworkCategory({
        storeId,
        profileId: profileId || undefined,
        name: categoryName.trim(),
        slug: categorySlug.trim().toLowerCase(),
      });
      setCategoryName('');
      setCategorySlug('');
      setMessage('Artwork category created');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to create category');
    }
  };

  const uploadAsset = async () => {
    if (!assetFile) return;
    try {
      await apiClient.uploadCustomizerArtworkAsset({
        storeId,
        categoryId: assetCategoryId || undefined,
        name: assetName || undefined,
        tags: assetTags || undefined,
        file: assetFile,
      });
      setAssetFile(null);
      setAssetName('');
      setAssetTags('');
      setMessage('Artwork uploaded');
      await load();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || error?.message || 'Failed to upload artwork');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Product Builder</h1>

      <div className="border rounded bg-white p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="input-base" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="storeId" />
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Customizer enabled for this product
        </label>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>Reload</button>
      </div>

      {message && <div className="mb-3 text-sm text-slate-700">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded bg-white p-4">
          <h2 className="font-medium mb-2">Decoration Areas (JSON)</h2>
          <textarea className="input-base min-h-[220px] w-full" value={locationsJson} onChange={(e) => setLocationsJson(e.target.value)} />
          <h3 className="font-medium mt-3 mb-2">Rules (JSON)</h3>
          <textarea className="input-base min-h-[120px] w-full" value={rulesJson} onChange={(e) => setRulesJson(e.target.value)} />
          <button className="btn btn-primary mt-3" onClick={saveProfile}>Save Profile</button>
        </div>

        <div className="border rounded bg-white p-4">
          <h2 className="font-medium mb-2">Personalization Schema (JSON Array)</h2>
          <textarea className="input-base min-h-[360px] w-full" value={schemasJson} onChange={(e) => setSchemasJson(e.target.value)} />
          <button className="btn btn-primary mt-3" onClick={saveSchemas}>Save Personalization</button>
        </div>
      </div>

      <div className="border rounded bg-white p-4 mt-4">
        <h2 className="font-medium mb-2">Artwork Library</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          <input className="input-base" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category name" />
          <input className="input-base" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} placeholder="category-slug" />
          <button className="btn btn-secondary" onClick={createCategory}>Create Category</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <select className="input-base" value={assetCategoryId} onChange={(e) => setAssetCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input-base" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Asset name" />
          <input className="input-base" value={assetTags} onChange={(e) => setAssetTags(e.target.value)} placeholder="tags,comma,separated" />
          <input className="input-base" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setAssetFile(e.target.files?.[0] || null)} />
        </div>
        <button className="btn btn-primary mb-3" onClick={uploadAsset} disabled={!assetFile}>Upload Artwork</button>

        <div className="space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="border rounded p-3">
              <div className="font-medium mb-2">{category.name}</div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {(category.assets || []).map((asset: any) => (
                  <div key={asset.id} className="text-xs">
                    {asset.file?.url ? <img src={asset.file.url} className="w-full h-20 object-cover rounded mb-1" /> : null}
                    <div>{asset.name}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
