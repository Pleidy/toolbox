import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { crx } from '@crxjs/vite-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    crx({
      manifest: {
        name: 'QRCode Toolbox',
        description: '二维码生成和解码工具',
        version: '1.0.0',
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
}))
