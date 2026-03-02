import React from 'react';
import { Link } from 'react-router-dom';

export default function AppNotFoundPage() {
  return (
    <div className="deco-page">
      <div className="deco-panel">
        <div className="deco-panel-head">Page Not Found</div>
        <div className="deco-panel-body">
          <p className="text-sm text-slate-600">This section does not exist yet.</p>
          <Link to="/app" className="deco-btn-primary mt-3">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
