import React from 'react';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="deco-panel">
      <div className="deco-panel-body flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function LoadingState({ title = 'Loading' }: { title?: string }) {
  return (
    <div className="deco-panel">
      <div className="deco-panel-body">
        <div className="text-sm font-medium text-slate-700">{title}…</div>
        <div className="mt-2 h-2 w-full animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const requestIdMatch = message.match(/requestId=([a-zA-Z0-9-]+)/);
  const requestId = requestIdMatch?.[1] || null;
  return (
    <div className="deco-panel">
      <div className="deco-panel-body">
        <div className="text-sm font-semibold text-red-700">Unable to load data</div>
        <div className="mt-1 text-xs text-slate-600">{message}</div>
        {requestId ? <div className="mt-1 text-xs text-slate-500">Request ID: {requestId}</div> : null}
        <button className="deco-btn mt-3" onClick={onRetry}>Retry</button>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="deco-panel">
      <div className="deco-panel-body">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
    </div>
  );
}
