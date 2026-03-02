import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { PageHeader } from './ui';

export default function AppProductionPage() {
  return (
    <div className="deco-page">
      <PageHeader title="Production" subtitle="Manage board workflow and production jobs." />

      <div className="deco-panel">
        <div className="deco-panel-body flex gap-2">
          <NavLink to="/app/production/board" className={({ isActive }) => `deco-btn ${isActive ? 'deco-btn-primary' : ''}`}>Board</NavLink>
          <NavLink to="/app/production/jobs" className={({ isActive }) => `deco-btn ${isActive ? 'deco-btn-primary' : ''}`}>Jobs</NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
