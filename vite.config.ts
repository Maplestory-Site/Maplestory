import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-expect-error local Vercel-style API handler
import contentHandler from './api/content.js'
// @ts-expect-error local Vercel-style API handler
import databaseHandler from './api/database.js'
// @ts-expect-error local Vercel-style API handler
import gameHandler from './api/game.js'

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
            const requestUrl = new URL(req.url, 'http://localhost')
            if (requestUrl.pathname === '/api/content') {
              const localReq = req as typeof req & {
                query: Record<string, string>
                body?: unknown
              }
              localReq.query = Object.fromEntries(requestUrl.searchParams.entries())
              localReq.body = req.method === 'POST' ? await readJsonBody(req) : {}
              await contentHandler(localReq, createLocalApiResponse(res))
              return
            }
            const contentRoutes: Record<string, string> = {
              '/api/youtube': 'youtube-feed',
              '/api/kms/feed': 'kms-feed',
              '/api/kms': 'kms-article',
              '/api/gms': 'gms-article',
              '/api/news': 'news-feed',
              '/api/news/latest': 'news-latest',
              '/api/news/refresh': 'news-refresh'
            }
            const newsItemMatch = /^\/api\/news\/([^/]+)$/.exec(requestUrl.pathname)
            const contentResource = contentRoutes[requestUrl.pathname]
            if (contentResource || newsItemMatch) {
              const localReq = req as typeof req & {
                query: Record<string, string>
                body?: unknown
              }
              localReq.query = {
                resource: contentResource || 'news-item',
                ...Object.fromEntries(requestUrl.searchParams.entries())
              }
              if (newsItemMatch) {
                localReq.query.id = decodeURIComponent(newsItemMatch[1])
              }
              localReq.body = req.method === 'POST' ? await readJsonBody(req) : {}
              await contentHandler(localReq, createLocalApiResponse(res))
              return
            }
            const databaseRoutes: Record<string, string> = {
              '/api/items': 'items',
              '/api/maps': 'maps',
              '/api/monsters': 'monsters'
            }
            const databaseResource = databaseRoutes[requestUrl.pathname]
            if (databaseResource) {
              const localReq = req as typeof req & {
                query: Record<string, string>
                body?: unknown
              }
              localReq.query = {
                resource: databaseResource,
                ...Object.fromEntries(requestUrl.searchParams.entries())
              }
              localReq.body = {}
              await databaseHandler(localReq, createLocalApiResponse(res))
              return
            }
            const gameRoutes: Record<string, string> = {
              '/api/leaderboard': 'leaderboard',
              '/api/progress': 'progress',
              '/api/rooms': 'rooms',
              '/api/auth': 'auth',
              '/api/guilds': 'guilds',
              '/api/chat': 'chat',
              '/api/social': 'social'
            }
            const gameResource = gameRoutes[requestUrl.pathname]
            if (gameResource) {
              const localReq = req as typeof req & {
                query: Record<string, string>
                body?: unknown
              }
              localReq.query = { resource: gameResource }
              requestUrl.searchParams.forEach((value, key) => {
                localReq.query[key] = value
              })
              localReq.body = req.method === 'POST' ? await readJsonBody(req) : undefined
              await gameHandler(localReq, createLocalApiResponse(res))
              return
            }
            if (requestUrl.pathname.startsWith('/api/')) {
              const knownRoutes = [
                '/api/content',
                ...Object.keys(contentRoutes),
                '/api/news/:id',
                ...Object.keys(databaseRoutes),
                ...Object.keys(gameRoutes)
              ]
              const message = `No local API route configured for ${requestUrl.pathname}`
              console.warn(`[local-api-proxy] ${message}`)
              res.statusCode = 404
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: message, knownRoutes }))
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
