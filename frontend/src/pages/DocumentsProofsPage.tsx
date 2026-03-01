import React from 'react';
import DocumentsIndexPage from './DocumentsIndexPage';

export default function DocumentsProofsPage() {
  return <DocumentsIndexPage type="PROOF" title="Proof PDFs" ctaHref="/app/artwork" ctaLabel="Open proof requests" />;
}
