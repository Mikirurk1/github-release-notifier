# GitHub Release Notifier

A small monolithic Node.js service that allows users to subscribe to email notifications about new GitHub repository releases.

After a subscription is created, the service periodically checks releases via the GitHub API and sends an email only when a new tag appears.

## What's Included

- REST API for creating subscriptions (contract: `openapi.yaml`, unchanged)
- **gRPC** `CreateSubscription` (same business logic as REST; see `proto/subscription.proto`)
- Background scanner (checks releases on an interval)
- Notifier for sending emails
- PostgreSQL for subscription storage
- Prisma + migrations
- Swagger UI for contract preview
- Redis cache (optional)
- `/metrics` endpoint for Prometheus

## Tech Stack

- Node.js + Express
- TypeScript
- PostgreSQL
- Prisma
- gRPC (`@grpc/grpc-js`, `@grpc/proto-loader`)
- Nodemailer (SMTP)
- Redis (optional)
- Docker + Docker Compose

## Static frontend

- Page: `public/index.html`
- SCSS source: `public/assets/styles/` — entry `main.scss`, partials `_*.scss` (including `_variables.scss`, `_mixins.scss`)
- Compiled stylesheet served by Express: `public/assets/styles/main.min.css`
- Rebuild CSS: `npm run build:public-css` (also runs automatically as part of `npm run build`)
- Client script: `public/assets/scripts/subscribe.js`
- Images: `public/assets/images/`

## Quick Start (Local)

1) Create `.env`:

```bash
cp .env.example .env
```

2) Install dependencies:

```bash
npm install
```

3) Generate Prisma client:

```bash
npm run prisma:generate
```

4) Apply migrations:

```bash
npm run prisma:migrate:deploy
```

5) Start the service:

```bash
npm run dev
```

## Run with Docker

```bash
docker compose up --build
```

If the API container exits with **"The datasource.url property is required"**, the Docker image is likely **stale** (cached from an older `Dockerfile` without `prisma.config.mjs` inside the image). Rebuild the API image without cache:

```bash
docker compose build --no-cache api
docker compose up
```

After startup:

- API: `http://localhost:3000`
- HTML subscription page: `http://localhost:3000/`
- Swagger: `http://localhost:3000/api-docs`
- Metrics: `http://localhost:3000/metrics`
- gRPC: `localhost:50051` (method `notifier.SubscriptionService/CreateSubscription`)
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## API

Contract: `openapi.yaml`  
Swagger UI: `GET /api-docs`

Main endpoint:

- `POST /api/subscriptions`

Example:

```bash
curl -X POST http://localhost:3000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","repo":"octocat/Hello-World"}'
```

> If `API_KEY` is set, pass the `x-api-key` header.

## gRPC (same monolith process as HTTP)

- Proto: `proto/subscription.proto` — service `notifier.SubscriptionService`, RPC `CreateSubscription`.
- Port: `GRPC_PORT` (default **50051**). Set `GRPC_PORT=0` to disable gRPC (e.g. constrained environments).
- Must differ from `PORT` (HTTP).
- If `API_KEY` is set, send metadata **`x-api-key`** (same value as REST).

Example with [grpcurl](https://github.com/fullstorydev/grpcurl):

```bash
grpcurl -plaintext \
  -import-path ./proto -proto subscription.proto \
  -d '{"email":"john@example.com","repo":"octocat/Hello-World"}' \
  localhost:50051 notifier.SubscriptionService/CreateSubscription
```

With API key:

```bash
grpcurl -plaintext \
  -H 'x-api-key: YOUR_SECRET' \
  -import-path ./proto -proto subscription.proto \
  -d '{"email":"john@example.com","repo":"octocat/Hello-World"}' \
  localhost:50051 notifier.SubscriptionService/CreateSubscription
```

Response fields mirror the REST JSON shape: `id`, `email`, `repo`, `last_seen_tag`, `created_at` (ISO-8601), `already_subscribed`.

## Public deployment (checklist)

The app is **Docker-ready** (`Dockerfile` + `docker-compose.yml`). Hosting is your account-specific step; use any platform that runs containers or Node and provides **PostgreSQL**.

**Minimum environment variables on the host:**

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Managed Postgres connection string (SSL often required: `?sslmode=require`) |
| `SMTP_*` / `SMTP_FROM` | Real SMTP or transactional provider (Mailtrap is for dev only) |
| `PUBLIC_APP_URL` | **HTTPS** public URL of the app (for unsubscribe links in emails), e.g. `https://your-app.example.com` |
| `GITHUB_TOKEN` | Strongly recommended in production (higher GitHub API rate limits) |
| `PORT` | Usually set by the platform (e.g. `3000`) |
| `GRPC_PORT` | Optional; e.g. `50051` if you expose gRPC (and open the port in the platform firewall / load balancer) |
| `API_KEY` | Optional; if set, require `x-api-key` on REST and gRPC metadata |

**Suggested platforms:** [Fly.io](https://fly.io/), [Railway](https://railway.app/), [Render](https://render.com/) — connect the GitHub repo, set env vars, use the repo `Dockerfile` as the build/run image, attach a Postgres plugin, and map public HTTP to `PORT`. Run `prisma migrate deploy` is already invoked at container start (`Dockerfile` `CMD`).

After deploy, open `https://<your-host>/` for the HTML subscription page and `/api-docs` for Swagger.

## Release Checking Logic

The scanner runs every `SCANNER_INTERVAL_MS` (5 minutes by default):

1. Loads all subscriptions from the database
2. Fetches the latest release for each repository
3. Compares release tag with `lastSeenTag`
4. If the tag is new, sends email and updates `lastSeenTag`

`lastSeenTag` prevents duplicate notifications for the same release.

## Validation and Error Handling

- Required repo format: `owner/repo`
- `400` for invalid payload/format
- `404` if repository is not found on GitHub
- Retry/backoff for GitHub API `429` and `5xx` responses

## Migrations

Migrations run through `prisma migrate deploy`:

- on service startup (`src/server.ts`)
- in Docker startup command (`Dockerfile`)

The database URL is set in `prisma.config.mjs` (Prisma 7). NPM scripts pass `--config=./prisma.config.mjs`. Run CLI commands from the **repository root**, and set `DATABASE_URL` in `.env` or in the process environment (Docker Compose sets it for the `api` service).

## Tests and Code Quality

```bash
npm run lint
npm run build
npm test
```

Unit tests cover:

- `subscriptionService`
- `releaseService`
- `scannerJob`
- gRPC error mapping (`appErrorToGrpc`)

CI: `.github/workflows/ci.yml` (lint + build + tests on push/PR).

## Case Requirements Coverage

### Mandatory Requirements

- [x] OpenAPI/Swagger contract without API changes
- [x] Monolith (API + scanner + notifier)
- [x] Data in DB + automatic migrations
- [x] Dockerfile + docker-compose
- [x] Regular scanner with `lastSeenTag`
- [x] Repository validation on subscribe (`400`/`404`)
- [x] GitHub API rate limit/error handling
- [x] Thin framework usage (Express)
- [x] Unit tests for business logic

### Extra Features Implemented

- [x] HTML subscription page (`GET /`)
- [x] Redis cache for GitHub API responses (10 min TTL)
- [x] API key auth (`x-api-key`)
- [x] Prometheus metrics (`/metrics`)
- [x] GitHub Actions CI
- [x] gRPC `CreateSubscription` (monolith, shared service layer with REST)
- [x] Public deployment guide (Docker + env checklist; host on Fly/Railway/Render, etc.)

## Execution flow (logic overview)

1. **Subscribe (REST or gRPC)** — validate payload → GitHub API confirms repo exists → upsert row in Postgres (`lastSeenTag` null until first notify) → optional welcome email → REST returns `201` / `200` with `alreadySubscribed`; gRPC returns the same facts in the response message.
2. **Scanner (timer)** — loads all subscriptions → for each repo fetches **latest GitHub Release** (not “push to main”) → compares `tag_name` to `lastSeenTag` → on change, sends email and updates `lastSeenTag`.
3. **GitHub client** — retries with backoff on `429` / `5xx`; optional Redis caches repo/release responses for `GITHUB_CACHE_TTL_SEC`.
4. **Unsubscribe** — one-time token in DB; `GET /unsubscribe/:token` deletes the subscription (no API key).
