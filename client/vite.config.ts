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
        manualChunks: {
          three: ['three'],
          game: ['./src/game/'],
          ui: ['./src/ui/'],
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
