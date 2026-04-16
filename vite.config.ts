import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { crx } from '@crxjs/vite-plugin';

function manualChunks(id: string) {
  if (id.includes('node_modules')) {
    if (
      id.includes('jspdf') ||
      id.includes('html2canvas') ||
      id.includes('jszip') ||
      id.includes('file-saver')
    ) {
      return 'export-vendor';
    }
  }

  if (id.includes('/src/components/qrcode/') || id.includes('/src/lib/qrcode')) {
    return 'tool-qrcode';
  }

  if (id.includes('/src/components/json/')) {
    return 'tool-json';
  }

  if (id.includes('/src/components/image/')) {
    return 'tool-image';
  }

  if (id.includes('/src/components/encoder/')) {
    return 'tool-encoder';
  }

  return undefined;
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    crx({
      manifest: {
        name: 'Toolbox',
        description: '工具箱',
        version: '1.3.1',
        manifest_version: 3,
        action: {
          default_popup: 'index.html',
          default_title: '打开工具箱',
        },
        icons: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png',
        },
        permissions: [],
      },
    }),
  ],
  base: mode === 'production' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
}));
