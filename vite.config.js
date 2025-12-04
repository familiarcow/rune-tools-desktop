import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/renderer/index.html',
      output: {
        entryFileNames: 'renderer.js',
        format: 'iife' // Electron-compatible bundle format
      }
    },
    target: 'chrome91', // Match Electron version
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  base: './', // Relative paths for Electron
  server: {
    port: 3000
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  },
  optimizeDeps: {
    include: ['buffer', 'bip39']
  }
})