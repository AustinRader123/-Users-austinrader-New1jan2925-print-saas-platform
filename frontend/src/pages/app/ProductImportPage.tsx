import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from './ui';

export default function AppProductImportPage() {
  return (
    <div className="deco-page">
      <PageHeader
        title="Import Products"
        subtitle="Upload CSV catalog data and validate before import."
        actions={<Link className="deco-btn" to="/app/products">Back to Products</Link>}
      />

      <div className="deco-panel">
        <div className="deco-panel-body space-y-3">
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
            Drag and drop CSV here, or click to choose a file.
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            <button className="deco-btn">Choose CSV</button>
            <button className="deco-btn">Validate</button>
            <button className="deco-btn-primary">Import</button>
          </div>
        </div>
      </div>

      <div className="deco-panel">
        <div className="deco-panel-head">Import Preview</div>
        <div className="deco-panel-body text-xs text-slate-500">No file selected yet.</div>
      </div>
    </div>
  );
}
