import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function DesignPage() {
  const navigate = useNavigate();
  const [designs, setDesigns] = React.useState<any[]>([]);
  const [name, setName] = React.useState('Untitled Design');
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    const list = await apiClient.listDesigns(0, 50);
    setDesigns(list || []);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setLoading(true);
    try {
      const created = await apiClient.createDesign({
        name: name.trim() || 'Untitled Design',
        content: { layers: [], canvas: { width: 800, height: 600 } },
      });
      navigate(`/designs/${created.id}/edit`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Designs</h1>
      <div className="border rounded bg-white p-4 mb-4 flex gap-2">
        <input className="input-base flex-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Design name" />
        <button className="btn btn-primary" onClick={create} disabled={loading}>{loading ? 'Creating…' : 'New Design'}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {designs.map((design) => (
          <button
            key={design.id}
            onClick={() => navigate(`/designs/${design.id}/edit`)}
            className="text-left border rounded bg-white p-3"
          >
            <div className="font-medium">{design.name}</div>
            <div className="text-xs text-slate-600">{design.status}</div>
            <div className="text-xs text-slate-500">{new Date(design.updatedAt).toLocaleString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
