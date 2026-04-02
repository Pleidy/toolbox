import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function manualChunks(id) {
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

export default defineConfig({
  configFile: false,
  plugins: [react()],
  postcss: './postcss.config.cjs',
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
});
