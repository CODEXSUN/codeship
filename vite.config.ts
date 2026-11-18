import { developmentWebServer } from '@workspace/framework';
import { createThemeInitScript } from '@workspace/ui/design-system/bootstrap';
import { appDetails } from './contracts/app';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  server: developmentWebServer({ root: fileURLToPath(new URL('./', import.meta.url)), prefix: 'CODESHIP', defaultPort: 4325, defaultWebPort: 4320 }),
  root: fileURLToPath(new URL('./src/web', import.meta.url)),
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [{ name: 'shared-theme-init', transformIndexHtml: { order: 'pre', handler: () => [{ tag: 'script', children: createThemeInitScript(`${appDetails.name}.ui.preferences`, { migrateToSilver: true }), injectTo: 'head-prepend' }] } }, tailwindcss()],
  build: { outDir: fileURLToPath(new URL('./dist/web', import.meta.url)), emptyOutDir: true },
});
