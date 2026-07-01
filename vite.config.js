import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildDate = (() => {
  // Pakistan Standard Time = UTC+5
  const d = new Date(new Date().getTime() + 5 * 60 * 60 * 1000)
  const dd   = String(d.getUTCDate()).padStart(2, '0')
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const hh   = String(d.getUTCHours()).padStart(2, '0')
  const min  = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dd}${mm}${yyyy}_${hh}${min}`
})()

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    target: 'es2020',
    cssTarget: 'chrome80',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor'
          if (id.includes('@react-pdf') || id.includes('react-pdf')) return 'react-pdf'
        },
      },
    },
  },
})