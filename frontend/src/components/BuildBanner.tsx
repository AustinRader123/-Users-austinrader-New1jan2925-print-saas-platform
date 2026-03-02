import React from 'react';
import { BUILD_INFO } from '../buildInfo';

export default function BuildBanner() {
  return (
    <div className="ui-build-banner" role="status" aria-live="polite">
      <span>UI commit {BUILD_INFO.commit}</span>
      <span>UI buildTime {BUILD_INFO.buildTime}</span>
      <span>UI env {BUILD_INFO.env}</span>
    </div>
  );
}
