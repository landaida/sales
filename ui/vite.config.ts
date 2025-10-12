import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDev = mode === 'development'

  // Dev proxy to GAS
  const GAS_ID  = env.VITE_GAS_DEPLOYMENT_ID || process.env.VITE_GAS_DEPLOYMENT_ID  || ''
  const apiBase = env.VITE_API_BASE || process.env.VITE_API_BASE ||''

  // GH Pages base path (injected by Action or set in .env.production if you want)
  const ghBase  = env.VITE_BASE || process.env.VITE_BASE || '/'

  return {
    base: isDev ? '/' : ghBase,
    server: {
      host: true,
      cors: true,
      proxy: apiBase === '/gsapi' && GAS_ID ? {
        '/gsapi': {
          target: 'https://script.google.com',
          changeOrigin: true,
          secure: true,
          // keep ?action=... intact and only swap the prefix
          rewrite: (path) => path.replace(/^\/gsapi/, `/macros/s/${GAS_ID}/exec`),
        }
      } : {}
    }
  }
})
