import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'libsodium-wrappers': 'libsodium-wrappers/dist/modules/libsodium-wrappers.js',
    },
  },
  optimizeDeps: {
    include: ['libsodium-wrappers'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
