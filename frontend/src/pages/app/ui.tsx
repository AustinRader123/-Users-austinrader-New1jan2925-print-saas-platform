import React from 'react';
import OpsPageHeader from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import Card, { CardBody } from '../../ui/Card';

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <OpsPageHeader title={title} subtitle={subtitle} actions={actions} />
  );
}

export function LoadingState({ title = 'Loading' }: { title?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-sm font-medium text-slate-700">{title}…</div>
        <div className="mt-2 h-2 w-full animate-pulse rounded bg-slate-200" />
      </CardBody>
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const requestIdMatch = message.match(/requestId=([a-zA-Z0-9-]+)/);
  const requestId = requestIdMatch?.[1] || null;
  return (
    <Card>
      <CardBody>
        <div className="text-sm font-semibold text-red-700">Unable to load data</div>
        <div className="mt-1 text-xs text-slate-600">{message}</div>
        {requestId ? <div className="mt-1 text-xs text-slate-500">Request ID: {requestId}</div> : null}
        <Button className="mt-3" onClick={onRetry}>Retry</Button>
      </CardBody>
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </CardBody>
    </Card>
  );
}
