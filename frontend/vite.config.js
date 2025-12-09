import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE || ''
  return {
    plugins: [react()],
    server: {
      proxy: apiBase ? {
        '/health': { target: apiBase, changeOrigin: true },
        '/locales': { target: apiBase, changeOrigin: true },
        '/reviews': { target: apiBase, changeOrigin: true },
        '/refresh': { target: apiBase, changeOrigin: true },
        '/cache': { target: apiBase, changeOrigin: true },
        '/monitors': { target: apiBase, changeOrigin: true },
      } : undefined,
    },
  }
})
