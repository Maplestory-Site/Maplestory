import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchKmsArticle } from './server/news/kmsArticle.mjs'
import { fetchGmsArticle } from './server/news/gmsArticle.mjs'
import { getKmsFeed } from './server/news/kmsFeed.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-api-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            if (!req.url) return next()
            if (req.url.startsWith('/api/kms?')) {
              const url = new URL(req.url, 'http://localhost')
              const target = url.searchParams.get('url')
              const force = url.searchParams.get('force') === '1'
              if (!target) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing url parameter.' }))
                return
              }
              const payload = await fetchKmsArticle(target, { forceRefresh: force })
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
              return
            }
            if (req.url.startsWith('/api/kms/feed')) {
              const feed = await getKmsFeed()
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(feed))
              return
            }
            if (req.url.startsWith('/api/gms?')) {
              const url = new URL(req.url, 'http://localhost')
              const target = url.searchParams.get('url')
              if (!target) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Missing url parameter.' }))
                return
              }
              const payload = await fetchGmsArticle(target)
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(payload))
              return
            }
          } catch (error) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: 'Local API error',
                message: error instanceof Error ? error.message : 'Unknown error'
              })
            )
            return
          }
          next()
        })
      }
    }
  ],
})
