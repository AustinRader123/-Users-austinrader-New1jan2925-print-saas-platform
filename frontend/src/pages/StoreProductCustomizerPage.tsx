import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

function buildDefaultLocations(profile: any) {
  const locations = Array.isArray(profile?.locations) ? profile.locations : [];
  return locations.map((loc: any) => ({
    key: String(loc?.key || ''),
    layers: [],
  }));
}

export default function StoreProductCustomizerPage() {
  const { slugOrId = '' } = useParams();
  const navigate = useNavigate();
  const storeSlug = localStorage.getItem('publicStoreSlug') || 'default';

  const [product, setProduct] = React.useState<any>(null);
  const [config, setConfig] = React.useState<any>(null);
  const [variantId, setVariantId] = React.useState('');
  const [quantity, setQuantity] = React.useState(1);
  const [locationsJson, setLocationsJson] = React.useState('[]');
  const [personalizationJson, setPersonalizationJson] = React.useState('{}');
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [previewFileId, setPreviewFileId] = React.useState('');
  const [uploadFileId, setUploadFileId] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState('');

  const ensureCart = async () => {
    let token = localStorage.getItem('publicCartToken');
    if (!token) {
      const cart = await apiClient.publicCreateCart(storeSlug);
      token = cart.token;
      localStorage.setItem('publicCartToken', token);
    }
    return token;
  };

  React.useEffect(() => {
    const load = async () => {
      setError('');
      const productData = await apiClient.publicGetProduct(storeSlug, slugOrId);
      setProduct(productData);
      setVariantId(productData?.variants?.[0]?.id || '');

      const cfg = await apiClient.publicGetCustomizerConfig({
        storeSlug,
        productId: productData.id,
      });
      setConfig(cfg);
      setLocationsJson(JSON.stringify(buildDefaultLocations(cfg.profile), null, 2));

      const defaults: Record<string, string> = {};
      for (const schema of cfg?.profile?.personalizationSchemas || []) {
        defaults[String(schema.key)] = '';
      }
      setPersonalizationJson(JSON.stringify(defaults, null, 2));
    };

    load().catch((e: any) => setError(e?.response?.data?.error || e?.message || 'Failed to load customizer'));
  }, [storeSlug, slugOrId]);

  const uploadCustomerArtwork = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const uploaded = await apiClient.publicUploadCustomizerFile({ storeSlug, file });
      setUploadFileId(uploaded.fileId);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const buildCustomizationPayload = () => {
    const locations = JSON.parse(locationsJson || '[]');
    const personalization = JSON.parse(personalizationJson || '{}');

    if (uploadFileId && Array.isArray(locations) && locations[0]) {
      const firstLayers = Array.isArray(locations[0].layers) ? locations[0].layers : [];
      const hasUpload = firstLayers.some((layer: any) => layer?.type === 'UPLOAD');
      if (!hasUpload) {
        firstLayers.push({
          type: 'UPLOAD',
          fileId: uploadFileId,
          x: 80,
          y: 80,
          width: 240,
          height: 240,
          rotation: 0,
        });
      }
      locations[0].layers = firstLayers;
    }

    return { locations, personalization };
  };

  const preview = async () => {
    if (!product || !variantId) return;
    setWorking(true);
    setError('');
    try {
      const customization = buildCustomizationPayload();
      const out = await apiClient.publicPreviewCustomization({
        storeSlug,
        productId: product.id,
        variantId,
        customization,
      });
      setPreviewUrl(out.previewUrl || '');
      setPreviewFileId(out.previewFileId || '');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Preview failed');
    } finally {
      setWorking(false);
    }
  };

  const addCustomizedItemToCart = async () => {
    if (!product || !variantId) return;
    setWorking(true);
    setError('');
    try {
      const token = await ensureCart();
      const customization = buildCustomizationPayload();
      await apiClient.publicCustomizeAndAddToCart(token, {
        productId: product.id,
        variantId,
        quantity,
        customization,
        previewFileId: previewFileId || undefined,
      });
      navigate('/store/cart');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to add custom item to cart');
    } finally {
      setWorking(false);
    }
  };

  if (!product) {
    return <div className="max-w-4xl mx-auto px-4 py-8">Loading customizer...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Customize {product.name}</h1>
      <p className="text-sm text-slate-600 mb-4">Edit your design payload, preview it, then add to cart.</p>

      {error ? <div className="text-sm text-red-600 mb-3">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <select className="input-base" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
          {(product.variants || []).map((variant: any) => (
            <option key={variant.id} value={variant.id}>{variant.name} ({variant.sku})</option>
          ))}
        </select>
        <input className="input-base" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
        <label className="input-base flex items-center gap-2">
          <span className="text-sm">Upload artwork</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => uploadCustomerArtwork(e.target.files?.[0] || null)} />
        </label>
      </div>
      {uploading ? <div className="text-xs text-slate-500 mb-2">Uploading file...</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded bg-white p-4">
          <h2 className="font-medium mb-2">Locations JSON</h2>
          <textarea className="input-base w-full min-h-[260px]" value={locationsJson} onChange={(e) => setLocationsJson(e.target.value)} />
        </div>

        <div className="border rounded bg-white p-4">
          <h2 className="font-medium mb-2">Personalization JSON</h2>
          <textarea className="input-base w-full min-h-[260px]" value={personalizationJson} onChange={(e) => setPersonalizationJson(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button className="btn btn-secondary" onClick={preview} disabled={working}>{working ? 'Working...' : 'Generate Preview'}</button>
        <button className="btn btn-primary" onClick={addCustomizedItemToCart} disabled={working}>{working ? 'Working...' : 'Customize & Add to Cart'}</button>
      </div>

      {previewUrl ? (
        <div className="mt-4 border rounded bg-white p-4">
          <h3 className="font-medium mb-2">Preview</h3>
          <img src={previewUrl} className="w-full max-h-[420px] object-contain" />
        </div>
      ) : null}

      {config?.categories?.length ? (
        <div className="mt-4 border rounded bg-white p-4">
          <h3 className="font-medium mb-2">Artwork Library</h3>
          <div className="space-y-3">
            {config.categories.map((category: any) => (
              <div key={category.id}>
                <div className="text-sm font-medium mb-1">{category.name}</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {(category.assets || []).map((asset: any) => (
                    <div key={asset.id} className="text-xs border rounded p-1">
                      {asset.file?.url ? <img src={asset.file.url} className="w-full h-20 object-cover rounded mb-1" /> : null}
                      <div>{asset.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
