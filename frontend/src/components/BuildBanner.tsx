import React from 'react';
import { BUILD_INFO } from '../buildInfo';

export default function BuildBanner() {
  const show = React.useMemo(() => {
    if (BUILD_INFO.env === 'prod' || BUILD_INFO.env === 'production') return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === '1';
  }, []);

  if (!show) return null;

  const shortCommit = String(BUILD_INFO.commit || 'local').slice(0, 7);

  return (
    <div className="ui-build-banner" role="status" aria-live="polite">
      <span>Build: {shortCommit}</span>
      <span>|</span>
      <span>{BUILD_INFO.buildTime}</span>
      <span>|</span>
      <span>{BUILD_INFO.version}</span>
    </div>
  );
}
