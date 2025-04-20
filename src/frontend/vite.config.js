import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/mcp': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
