export const BUILD_INFO = {
  commit: (import.meta as any).env?.VITE_GIT_COMMIT ?? "local",
  buildTime: (import.meta as any).env?.VITE_BUILD_TIME ?? new Date().toISOString(),
};
