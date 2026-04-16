import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error local Vercel-style API handler
import contentHandler from './api/content.js'
// @ts-expect-error local Node-side mjs helper
import { fetchKmsArticle } from './server/news/kmsArticle.mjs'
// @ts-expect-error local Node-side mjs helper
import { fetchGmsArticle } from './server/news/gmsArticle.mjs'
// @ts-expect-error local Node-side mjs helper
import { getKmsFeed } from './server/news/kmsFeed.mjs'

async function readJsonBody(req: { on: (event: string, callback: (chunk?: Buffer) => void) => void }) {
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk?: Buffer) => {
      if (chunk) chunks.push(Buffer.from(chunk))
    })
    req.on('end', () => resolve())
    req.on('error', () => reject(new Error('Failed to read request body.')))
  })

  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

function createLocalApiResponse(res: {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (body?: string) => void
}) {
  return {
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
    status(code: number) {
      res.statusCode = code
      return this
    },
    json(payload: unknown) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(payload))
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    strictPort: true
  },
  plugins: [
    react(),
    {
      name: 'local-api-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          try {
            if (!req.url) return next()
            if (req.url.startsWith('/api/content?')) {
              const url = new URL(req.url, 'http://localhost')
              const localReq = req as typeof req & {
                query: Record<string, string>
                body?: unknown
              }
              localReq.query = Object.fromEntries(url.searchParams.entries())
              localReq.body = req.method === 'POST' ? await readJsonBody(req) : {}
              await contentHandler(localReq, createLocalApiResponse(res))
              return
            }
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
