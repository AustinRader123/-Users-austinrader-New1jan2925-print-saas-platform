import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <nav className="text-xs text-slate-700 mb-2">
      {items.map((it, i) => (
        <span key={i}>
          {it.to ? <Link to={it.to} className="hover:underline">{it.label}</Link> : <span>{it.label}</span>}
          {i < items.length - 1 && <span className="mx-1 text-slate-400">/</span>}
        </span>
      ))}
    </nav>
  );
}
