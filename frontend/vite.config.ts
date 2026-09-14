import type { ServerResponse } from 'node:http'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The backend (FastAPI, port 8000) is developed in parallel and is often not running.
 * When the proxy cannot reach it we answer `204 No Content` ourselves rather than letting the
 * socket error reach the browser. 204 is the one answer that tells the client "nothing here"
 * without Chrome logging a failed request — so `npm run dev` with no backend falls back to
 * fixtures with a completely clean console. `client.ts` treats a 204 as "backend offline".
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            // `res` is a Socket for websocket upgrades — nothing to answer there.
            if (typeof (res as { writeHead?: unknown }).writeHead !== 'function') return
            const response = res as ServerResponse
            if (!response.headersSent) {
              response.writeHead(204, { 'x-munshiji-proxy': 'backend-offline' })
            }
            response.end()
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
