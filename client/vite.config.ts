import { defineConfig } from 'vite'
import compression from 'vite-plugin-compression'

export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('/src/game/')) return 'game'
          if (id.includes('/src/ui/')) return 'ui'
        },
      },
    },
  },
  plugins: [
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
})
