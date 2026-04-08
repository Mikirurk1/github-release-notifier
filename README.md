# GitHub Release Notifier

A small monolithic Node.js service that allows users to subscribe to email notifications about new GitHub repository releases.

After a subscription is created, the service periodically checks releases via the GitHub API and sends an email only when a new tag appears.

## What's Included

- REST API for creating subscriptions
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

### Not Implemented Yet

- [ ] Public deployment
- [ ] gRPC interface
# github-release-notifier
