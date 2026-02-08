import React from 'react';

export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-4 text-rose-700 text-sm">
      {message}
    </div>
  );
}
