import React, { useState } from 'react';
import { apiClient } from '../lib/api';

export default function KanbanPackButton({ jobId, onSuccess, initialReady }: { jobId: string; onSuccess?: (msg?: string) => void; initialReady?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [packUrl, setPackUrl] = useState<string | null>(initialReady ? `/api/admin/production/jobs/${jobId}/pack/download` : null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    try {
      setBusy(true);
      setError(null);
      const resp = await apiClient.adminGenerateProductionPack(jobId);
      setPackUrl(resp.url);
      if (onSuccess) onSuccess('Pack ready');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to generate pack');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex items-center justify-between">
      {packUrl ? (
        <a
          href={packUrl}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
          data-testid="pack-download"
        >
          Download Pack
        </a>
      ) : (
        <button
          disabled={busy}
          onClick={generate}
          className="text-xs px-2 py-1 border rounded"
          data-testid="generate-pack"
        >
          {busy ? 'Generating…' : 'Generate Pack'}
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
