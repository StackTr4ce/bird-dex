import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          supabase: ['@supabase/supabase-js', '@supabase/storage-js'],
          router: ['react-router-dom']
        }
      }
    }
  },
  // Ensure SPA routing works in preview mode
  preview: {
    port: 3000,
    host: true
  }
})
