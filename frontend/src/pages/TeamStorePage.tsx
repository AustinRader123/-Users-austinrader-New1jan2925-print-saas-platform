import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function TeamStorePage() {
  const { slug = '' } = useParams();
  const [teamStore, setTeamStore] = React.useState<any>(null);
  const [products, setProducts] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const list = await apiClient.listTeamStores('default');
      const matched = (list || []).find((entry: any) => entry.slug === slug) || null;
      setTeamStore(matched);
      const rows = await apiClient.publicListProducts('default');
      setProducts(rows || []);
    })();
  }, [slug]);

  if (!teamStore) return <div className="max-w-5xl mx-auto px-4 py-8">Team store not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">{teamStore.name}</h1>
      <p className="text-sm text-slate-600 mb-4">Closes: {teamStore.closeAt ? new Date(teamStore.closeAt).toLocaleString() : 'N/A'}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {products.map((product) => (
          <Link key={product.id} to={`/team/${slug}/products/${product.id}`} className="rounded border bg-white p-3">
            <div className="font-medium">{product.name}</div>
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <Link to={`/team/${slug}/cart`} className="btn btn-primary">Team Cart</Link>
      </div>
    </div>
  );
}
