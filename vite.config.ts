import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const postback = (env.POSTBACK_API_URL || 'http://127.0.0.1:8000').replace(
    /\/$/,
    '',
  )

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Локально: /api/deposit/123 → FastAPI /deposit/123
        '/api/deposit': {
          target: postback,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    build: {
      sourcemap: false,
      minify: true,
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          entryFileNames: 'w/[hash].js',
          chunkFileNames: 'w/[hash].js',
          assetFileNames: 'w/[hash][extname]',
        },
      },
    },
  }
})
