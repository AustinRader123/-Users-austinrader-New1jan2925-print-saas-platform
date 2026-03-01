import React from 'react';
import DocumentsIndexPage from './DocumentsIndexPage';

export default function DocumentsQuotesPage() {
  return <DocumentsIndexPage type="QUOTE" title="Quote PDFs" ctaHref="/dashboard/quotes" ctaLabel="Create or send a quote" />;
}
