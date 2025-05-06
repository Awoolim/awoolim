import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: [
          'electron',
          'electron-devtools-installer',
          'electron-store',
          '@tensorflow/tfjs-node'
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [svelte()]
  }
})
