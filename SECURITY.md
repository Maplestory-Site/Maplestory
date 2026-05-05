# Security Notes

This document reflects the current codebase after the production-readiness pass.

## Authentication

- `/api/auth` hashes passwords server-side and returns a signed session token.
- Frontend session data is stored under `snailslayer-session`.
- The browser stores the public user profile and token only. It must never store
  plaintext passwords or password hashes.
- Protected client calls send `Authorization: Bearer <token>`.

Required env:

```text
SESSION_SECRET=long-random-secret
```

## Protected Mutations

Private/mutating game APIs derive the user id from the verified session token.
Client-supplied `userId` values are ignored for protected writes.

Protected areas include:

- leaderboard submission
- progress load/save
- multiplayer room writes
- guild create/join
- chat post
- IdleStory social sync, guild raid, and shadow battle writes

Payloads are bounded for score, progress JSON size, chat length, and guild raid
damage.

## Raw HTML Fetch / SSRF

`api/content?resource=fetch-html` is disabled by default.

To enable it intentionally:

```text
ALLOW_RAW_HTML_FETCH=true
```

When enabled, the endpoint validates:

- host allowlist
- DNS resolution
- localhost/private/link-local/metadata IP blocking
- redirect targets
- content type
- response size

## Storage

Server persistence goes through `server/storage/index.mjs`.

Local JSON storage is intended for development and tests. Production must
configure durable storage, or explicitly opt into the temporary local adapter:

```text
ALLOW_LOCAL_JSON_STORAGE=true
```

Production deployments without durable storage fail loudly rather than silently
writing ephemeral data.

## Remaining Risks

- Rate limiting is still minimal and should be added before public competitive
  launch.
- The local JSON adapter is not concurrency-safe under heavy writes.
- Large Library data bundles are a performance concern, not a direct security
  issue.
