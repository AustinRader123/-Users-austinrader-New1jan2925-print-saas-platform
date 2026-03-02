export const BUILD_INFO = {
  commit: (import.meta as any).env?.VITE_GIT_COMMIT_SHA ?? 'local',
  buildTime: (import.meta as any).env?.VITE_BUILD_TIME ?? ((import.meta as any).env?.DEV ? new Date().toISOString() : 'unknown'),
  env: (import.meta as any).env?.VITE_UI_ENV ?? ((import.meta as any).env?.PROD ? 'prod' : 'preview'),
};
