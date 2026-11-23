import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Older versions of this repository served numbered Bannlai images from
      // public/assets/bannlai. Keep those URLs working with the image files now
      // stored in the repository root.
      {
        name: 'serve-root-bannlai-assets',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const url = req.url || '';
            const match = url.match(/^\/assets\/bannlai\/(\d{2})-[^/?]+\.png(\?.*)?$/i);
            if (!match) {
              next();
              return;
            }

            const assetName = fs
              .readdirSync(__dirname)
              .find((name) => name.startsWith(`${match[1]}-`) && name.toLowerCase().endsWith('.png'));
            if (assetName) {
              req.url = `/${encodeURIComponent(assetName)}${match[2] || ''}`;
            }
            next();
          });
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
