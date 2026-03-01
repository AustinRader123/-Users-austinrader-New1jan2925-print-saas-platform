import React from 'react';
import DocumentsIndexPage from './DocumentsIndexPage';

export default function DocumentsInvoicesPage() {
  return <DocumentsIndexPage type="INVOICE" title="Invoice PDFs" ctaHref="/app/orders" ctaLabel="Go to orders" />;
}
