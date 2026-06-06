

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Raise the limit to 1000 kB (1MB) so the warning goes away
    chunkSizeWarningLimit: 1000,
  }
})
