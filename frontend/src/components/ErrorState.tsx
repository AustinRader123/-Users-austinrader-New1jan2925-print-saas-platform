import React from 'react';

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="panel p-4 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', background: 'var(--bg-surface)' }}>
      {message}
    </div>
  );
}
