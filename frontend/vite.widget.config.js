import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
    global: 'globalThis',
  },
  build: {
    lib: {
      entry: 'src/widget/entry.jsx',
      name: 'ReviewsWidget',
      fileName: 'widget',
      formats: ['iife'],
    },
    rollupOptions: {
      // bundle everything (React included) for easy drop-in
      external: [],
      output: {
        entryFileNames: () => 'widget.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'widget.css'
          return assetInfo.name
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
})
