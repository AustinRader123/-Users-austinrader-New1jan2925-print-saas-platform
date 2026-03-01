import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api';

export default function TeamStoreCheckoutPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [teamStore, setTeamStore] = React.useState<any>(null);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [groupShipping, setGroupShipping] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    apiClient.listTeamStores('default').then((rows) => {
      setTeamStore((rows || []).find((entry: any) => entry.slug === slug) || null);
    });
  }, [slug]);

  const submit = async () => {
    try {
      if (!teamStore) return;
      if (teamStore.closeAt && new Date(teamStore.closeAt).getTime() <= Date.now()) {
        setError('This team store is closed.');
        return;
      }

      const cartToken = localStorage.getItem(`teamCartToken:${slug}`) || '';
      if (!cartToken) {
        setError('Cart is missing');
        return;
      }

      const out = await apiClient.publicCheckout(cartToken, {
        customerName: name,
        customerEmail: email,
        shippingAddress: { line1: address },
        teamStoreMeta: {
          teamStoreId: teamStore.id,
          groupShipping,
        },
      });

      localStorage.removeItem(`teamCartToken:${slug}`);
      navigate(`/store/order/${out.orderToken}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Checkout failed');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-3">Team Checkout</h1>
      {error && <div className="mb-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-sm text-rose-700">{error}</div>}
      <div className="space-y-2">
        <input className="input-base w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <input className="input-base w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="input-base w-full" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shipping address" />
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={groupShipping} onChange={(e) => setGroupShipping(e.target.checked)} />
          Group shipping
        </label>
        <button className="btn btn-primary" onClick={submit}>Submit Team Order</button>
      </div>
    </div>
  );
}
