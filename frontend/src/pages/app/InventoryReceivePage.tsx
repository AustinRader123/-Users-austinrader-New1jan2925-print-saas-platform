import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from './ui';

export default function AppInventoryReceivePage() {
  const navigate = useNavigate();
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="deco-page">
      <PageHeader
        title="Receive Inventory"
        subtitle="Record incoming stock and supplier references."
        actions={<Link className="deco-btn" to="/app/inventory">Back</Link>}
      />

      <div className="deco-panel">
        <div className="deco-panel-body grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-600">SKU<input className="deco-input mt-1 w-full" value={sku} onChange={(e) => setSku(e.target.value)} /></label>
          <label className="text-xs text-slate-600">Quantity<input className="deco-input mt-1 w-full" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></label>
          <div className="flex items-end gap-2"><button className="deco-btn-primary" onClick={() => navigate('/app/inventory')}>Receive</button></div>
        </div>
      </div>
    </div>
  );
}
