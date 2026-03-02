import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const buildTime = new Date().toISOString();
const gitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
const shortCommit = gitSha.slice(0, 7) || 'local';
const uiEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const appVersion = process.env.npm_package_version || '0.0.0';

const buildProof = {
  commit: gitSha,
  buildTime,
  env: uiEnv,
  version: appVersion,
};

function buildProofPlugin() {
  return {
    name: 'build-proof-plugin',
    configureServer(server: any) {
      const sendBuildProof = (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(buildProof));
      };
      server.middlewares.use('/__build.json', sendBuildProof);
      server.middlewares.use('/__ui_build.json', sendBuildProof);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '__build.json',
        source: JSON.stringify(buildProof, null, 2),
      });
      this.emitFile({
        type: 'asset',
        fileName: '__ui_build.json',
        source: JSON.stringify(buildProof, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), buildProofPlugin()],
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
    'import.meta.env.VITE_GIT_COMMIT_SHA': JSON.stringify(shortCommit),
    'import.meta.env.VITE_UI_ENV': JSON.stringify(uiEnv === 'production' ? 'prod' : uiEnv),
    'import.meta.env.VITE_GIT_SHA': JSON.stringify(gitSha),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'ES2020',
    outDir: 'dist',
    sourcemap: false,
  },
});
