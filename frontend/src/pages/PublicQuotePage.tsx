import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function PublicQuotePage() {
  const { token = '' } = useParams();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiClient.getPublicQuote(token);
        setState(data);
      } catch (e) {
        setError((e as Error).message || 'Failed to load quote');
      }
    };
    run();
  }, [token]);

  if (error) return <div className="max-w-3xl mx-auto px-4 py-8">{error}</div>;
  if (!state) return <div className="max-w-3xl mx-auto px-4 py-8">Loading quote...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Quote {state.quote?.quoteNumber}</h1>
      <div className="text-sm mb-4">{state.store?.name}</div>
      <div className="border rounded p-4 bg-white space-y-2">
        <div>Customer: {state.quote?.customerName || 'N/A'}</div>
        <div>Email: {state.quote?.customerEmail || 'N/A'}</div>
        <div>Status: {state.quote?.status}</div>
        <div>Total: ${Number(state.quote?.total || 0).toFixed(2)}</div>
      </div>
    </div>
  );
}
