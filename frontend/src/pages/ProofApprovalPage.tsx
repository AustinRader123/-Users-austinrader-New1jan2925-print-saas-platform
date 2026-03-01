import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function ProofApprovalPage() {
  const { token = '' } = useParams();
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const result = await apiClient.getPublicProof(token);
      setData(result);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load proof request');
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const respond = async (decision: 'approve' | 'reject') => {
    setLoading(true);
    try {
      if (decision === 'approve') {
        await apiClient.approvePublicProof(token, comment || undefined);
        setMessage('Proof approved. Thank you.');
      } else {
        await apiClient.rejectPublicProof(token, comment || undefined);
        setMessage('Proof rejected. We will follow up with revisions.');
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Artwork Proof Approval</h1>
      {error && <div className="mb-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {message && <div className="mb-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
      {data && (
        <div className="rounded border bg-white p-4 space-y-3">
          <div className="text-sm">Order: <span className="font-medium">{data.order?.orderNumber || data.orderId}</span></div>
          <div className="text-sm">Status: <span className="font-medium">{data.status}</span></div>
          {(data.mockup?.imageUrl || data.order?.items?.[0]?.mockupUrl) && (
            <img
              src={data.mockup?.imageUrl || data.order?.items?.[0]?.mockupUrl}
              alt="Proof preview"
              className="max-h-80 rounded border"
            />
          )}
          {data.status === 'PENDING' && (
            <>
              <textarea
                className="input-base w-full"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional comment"
              />
              <div className="flex gap-2">
                <button className="btn btn-primary" disabled={loading} onClick={() => respond('approve')}>Approve</button>
                <button className="btn btn-secondary" disabled={loading} onClick={() => respond('reject')}>Reject</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
