import React, { useState } from 'react';
import { apiClient } from '../lib/api';

export default function CSVUpload({ vendorId, storeId, onComplete }: { vendorId: string; storeId: string; onComplete?: (result: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<any>({
    productExternalId: 'productExternalId',
    productName: 'productName',
    productDescription: 'productDescription',
    brand: 'brand',
    category: 'category',
    imageUrl: 'imageUrl',
    variantExternalId: 'variantExternalId',
    variantSku: 'variantSku',
    variantSize: 'variantSize',
    variantColor: 'variantColor',
    variantPrice: 'variantPrice',
    variantInventory: 'variantInventory',
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const upload = async () => {
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const out = await apiClient.adminImportVendorCsv(vendorId, { storeId, file, mapping });
      setResult(out);
      onComplete?.(out);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="input-base"
        />
        <div>
          <label className="text-sm">Mapping (JSON)</label>
          <textarea
            className="input-base w-full h-32"
            value={JSON.stringify(mapping, null, 2)}
            onChange={(e) => {
              try {
                setMapping(JSON.parse(e.target.value));
              } catch {}
            }}
          />
        </div>
        <button className="btn btn-primary" onClick={upload} disabled={loading}>
          {loading ? 'Uploading…' : 'Upload & Import'}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {result && (
          <div className="mt-3">
            <div className="font-medium">Import Result</div>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}