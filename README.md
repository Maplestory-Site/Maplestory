# SnailSlayer MapleStory Creator Hub

React + TypeScript + Vite frontend with Vercel-style API handlers under `api/`.
The site includes NEWS, Maple Library, database pages, videos, community pages,
and IdleStory World.

## Setup

```bash
npm install
npm run dev
npm test
npm run lint
npx tsc -b --pretty false
npm run build
```

`npm run build` is deterministic and offline-safe by default. The `prebuild`
hook only prints a skip message unless `SYNC_REMOTE_ON_BUILD=true`.

## Scripts

- `dev`: Vite dev server with local `/api/*` middleware.
- `build`: `tsc -b && vite build`.
- `test`: full Vitest suite.
- `lint`: ESLint flat config.
- `check:public-assets`: verifies every static `/library/**` and `/idlestory/**` source reference exists in `public`.
- `sync:*`: explicit feed refresh scripts for news, videos, and database feeds.

## API And Auth

`/api/auth` issues an HMAC session token. The browser stores only the public
user profile plus the token in `snailslayer-session`; passwords and password
hashes are not stored in localStorage.

Private/mutating cloud calls send `Authorization: Bearer <token>`. API handlers
derive the user id from the verified token and ignore client-supplied `userId`
for protected mutations.

Set `SESSION_SECRET` to a long random value in any shared or production
environment.

## Storage

Server storage goes through `server/storage/index.mjs`.

- Dev/test can use the local JSON adapter.
- Production fails loudly unless durable storage env vars are configured, or
  `ALLOW_LOCAL_JSON_STORAGE=true` is explicitly set as a temporary fallback.

Supported env markers are listed in `.env.example`.

## External Sync

Remote sync is opt-in:

```bash
SYNC_REMOTE_ON_BUILD=true npm run sync:items
```

Feed guards prevent an empty remote response from overwriting a non-empty cached
feed. This protects `public/*-feed.json` during upstream outages.

## SSRF Restrictions

`api/content?resource=fetch-html` is disabled unless
`ALLOW_RAW_HTML_FETCH=true`. When enabled it:

- allows only configured Maple/news hosts
- rejects localhost/private/link-local/metadata IPs after DNS resolution
- validates redirects manually
- caps HTML responses to 2 MB
- requires HTML/XML content types

## Validation Status

Current production-readiness checks expected to pass:

```bash
npm test
npm run lint
npx tsc -b --pretty false
npm run build
npm run check:public-assets
npm audit --json
```

Known non-blocking warnings:

- Some React Hook dependency warnings remain in older mini-games.
- Library/catalog chunks are large and should be further split in a dedicated
  performance pass.
