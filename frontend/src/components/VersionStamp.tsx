import React from 'react';
import { buildInfo } from '../lib/buildInfo';

export default function VersionStamp() {
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1">
        <span>Version: {buildInfo.version} ({buildInfo.commit})</span>
        <span>Environment: {buildInfo.env}</span>
        <span>Build time: {buildInfo.buildTime}</span>
      </div>
    </div>
  );
}
