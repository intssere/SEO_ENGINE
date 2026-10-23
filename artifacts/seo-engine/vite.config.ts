import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    {
      name: 'ux-ch-module-attribution',
      generateBundle(_options, bundle) {
        if (process.env.UX_CH_BUNDLE_REPORT !== '1') return;
        const sizes = new Map<string, number>();
        for (const asset of Object.values(bundle)) {
          if (asset.type !== 'chunk') continue;
          for (const [moduleId, detail] of Object.entries(asset.modules)) {
            sizes.set(moduleId, (sizes.get(moduleId) ?? 0) + detail.renderedLength);
          }
        }
        const largest = [...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
        for (const [id, bytes] of largest) {
          const safeId = id.replaceAll('\\', '/').replace(/^.*?\/node_modules\//, 'node_modules/');
          console.info('UX_CH_BUNDLE_MODULE', bytes, safeId);
        }
      },
    },
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    target: 'es2022',
    // CH-R02G experiment: ES2022-target browsers natively support modulepreload.
    // Keep this only if CI budgets and cross-browser runtime certification pass.
    modulePreload: { polyfill: false },
    // CH-R02L: retain measured const bindings; trial arrow functions in ES2022 Rollup output.
    // Keep only if exact-head CI measures savings and runtime/browser tests pass.
    rollupOptions: { output: { generatedCode: { constBindings: true, arrowFunctions: true } } },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
