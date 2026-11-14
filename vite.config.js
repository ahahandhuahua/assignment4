import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/assignment4/',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  server: {
    port: 5174
  }
})
