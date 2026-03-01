import React, { useEffect, useMemo, useState } from 'react';
import { buildInfo } from '../lib/buildInfo';

type VersionPayload = {
  version?: string;
  commit?: string;
  buildTime?: string;
  env?: string;
};

export default function VersionStamp() {
  const [runtimeInfo, setRuntimeInfo] = useState<VersionPayload | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/version', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as VersionPayload;
      })
      .then((data) => {
        if (!active || !data) return;
        setRuntimeInfo(data);
      })
      .catch(() => {
      });

    return () => {
      active = false;
    };
  }, []);

  const resolved = useMemo(() => {
    return {
      version: runtimeInfo?.version || buildInfo.version,
      commit: runtimeInfo?.commit || buildInfo.commit,
      env: runtimeInfo?.env || buildInfo.env,
      buildTime: runtimeInfo?.buildTime || buildInfo.buildTime,
    };
  }, [runtimeInfo]);

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1">
        <span>Version: {resolved.version} ({resolved.commit})</span>
        <span>Environment: {resolved.env}</span>
        <span>Build time: {resolved.buildTime}</span>
      </div>
    </div>
  );
}
