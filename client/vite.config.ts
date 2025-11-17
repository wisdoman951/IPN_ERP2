import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      }
    },
    allowedHosts: ['.trycloudflare.com'],
    cors: true
  }
})
