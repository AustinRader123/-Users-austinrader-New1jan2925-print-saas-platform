import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import Breadcrumbs from '../components/Breadcrumbs';

export default function AdminSupplierRunDetailPage() {
  const { runId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const storeId = useMemo(() => searchParams.get('storeId') || undefined, [searchParams]);
  const [run, setRun] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    apiClient
      .adminGetSupplierRun(runId, storeId)
      .then(setRun)
      .catch((e: any) => setError(e?.response?.data?.error || e?.message || 'Failed to load run detail'));
  }, [runId, storeId]);

  if (error) {
    return <div className="max-w-5xl mx-auto px-4 py-8 text-red-600 text-sm">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-5">
      <div>
        <Breadcrumbs
          items={[
            { to: '/app', label: 'Dashboard' },
            { to: '/app/admin/suppliers', label: 'Supplier Sync' },
            { label: `Run ${runId}` },
          ]}
        />
        <h1 className="text-2xl font-semibold">Supplier Sync Run Detail</h1>
      </div>

      {!run && <div className="text-sm text-gray-600">Loading…</div>}

      {run && (
        <>
          <div className="border rounded p-4 bg-white">
            <div className="text-sm">Connection: <span className="font-medium">{run.supplierConnection?.name}</span></div>
            <div className="text-sm">Status: <span className="font-medium">{run.status}</span></div>
            <div className="text-sm">Started: {run.startedAt ? new Date(run.startedAt).toLocaleString() : '-'}</div>
            <div className="text-sm">Finished: {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '-'}</div>
            <div className="text-sm">Duration: {run.durationMs ?? 0} ms</div>
            <div className="mt-3 flex gap-2">
              <button className="btn btn-secondary" onClick={() => apiClient.downloadSupplierRunLog(run.id, storeId)}>Download Log</button>
              <Link className="btn btn-secondary" to="/app/admin/suppliers">Back</Link>
            </div>
          </div>

          <div className="border rounded p-4 bg-white">
            <h2 className="font-semibold mb-2">Counts</h2>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(run.counts || {}).map(([key, value]) => (
                  <tr key={key} className="border-t">
                    <td className="py-1 pr-2 font-medium">{key}</td>
                    <td className="py-1">{String(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border rounded p-4 bg-white">
            <h2 className="font-semibold mb-2">Top Errors</h2>
            {(run.errors || []).length === 0 && <div className="text-sm text-gray-500">No errors.</div>}
            {(run.errors || []).slice(0, 10).map((entry: any) => (
              <div key={entry.id} className="border rounded p-2 mb-2">
                <div className="text-xs uppercase text-gray-500">{entry.scope}</div>
                <div className="text-sm">{entry.message}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
