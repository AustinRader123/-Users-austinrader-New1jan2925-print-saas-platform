import React from 'react';

export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="panel p-6 text-center">
      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {description && <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</div>}
    </div>
  );
}
