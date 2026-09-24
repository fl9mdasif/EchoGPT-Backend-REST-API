# EchoGPT Backend

REST API for the EchoGPT Chrome Extension. NestJS + PostgreSQL + Prisma +
Swagger. Built for the AppifyDevs backend internship assignment — see
[`../docs/`](../docs) for the PRD, architecture notes, task breakdown, and a
running decisions/gotchas log.

## Stack

NestJS 12 · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL 16 · Passport JWT ·
Swagger (`@nestjs/swagger`) · class-validator/class-transformer · Vitest +
Supertest · Docker Compose

## Requirements

- Node.js 22+
- Docker (for Postgres; a local Postgres also works, see the port note below)

## Setup

```bash
cp .env.example .env
npm install --legacy-peer-deps
```

`--legacy-peer-deps` works around a known npm 11 bug on this dependency
graph, not a problem with the project's own dependencies — see
`../docs/memory.md` for details.

### Database

```bash
docker compose up -d db          # Postgres on localhost:55432
npx prisma migrate dev           # applies all migrations + regenerates the client
npx prisma db seed               # seeds an admin + demo user + a default AI provider
```

The compose Postgres publishes on host port **55432**, not the default
5432 — this machine already had two native Postgres services on 5432 and
5433. If that port's free for you, either works; just keep
`docker-compose.yml` and `.env`'s `DATABASE_URL` in agreement.

Seeded accounts (password `ChangeMe123!` for both):

| Email | Role | Plan |
|---|---|---|
| `admin@echogpt.dev` | ADMIN | PREMIUM |
| `demo@echogpt.dev` | USER | FREE |

### Run

```bash
npm run start:dev                # http://localhost:3000/api/v1
```

Swagger UI: http://localhost:3000/api/docs · raw spec:
http://localhost:3000/api/docs-json

### Run everything in Docker (api + db)

```bash
docker compose up -d --build
```

## Scripts

```bash
npm run build            # tsc build
npm run start:dev        # watch mode
npm run lint              # oxlint
npm run test               # unit tests (vitest)
npm run test:e2e            # e2e tests (vitest, needs a running Postgres)
npm run prisma:migrate      # prisma migrate dev
npm run prisma:generate     # regenerate the Prisma client
npm run prisma:seed         # re-run the seed script
```

## Project layout

```
src/
  common/        guards, decorators, filters, interceptors, dto, crypto shared across modules
  config/        typed + validated env config
  prisma/        PrismaModule/PrismaService (pg driver adapter)
  auth/          register/login/refresh/logout, JWT strategies, guards
  users/         profile, password change, account deletion
  subscriptions/ plans, usage limits, upgrade/downgrade
  ai-providers/  provider CRUD, AES-256-GCM key encryption, adapters, health check
  chat/          conversations, send prompt, SSE streaming
  search/        search query, history, suggestions, caching
  admin/         dashboard, user/subscription/provider admin, usage analytics, logs
  health/        liveness check
prisma/
  schema.prisma, migrations/, seed.ts
test/            *.e2e-spec.ts, one file per module
```

Every feature module follows the same shape: `*.module.ts`,
`*.controller.ts`, `*.service.ts`, `dto/`.

## API overview

All routes are under `/api/v1` and, unless marked `@Public()`
(auth's register/login/refresh/logout/verify-email, and `/health`), require
`Authorization: Bearer <accessToken>`. `/admin/*` additionally requires the
`ADMIN` role.

| Module | Routes |
|---|---|
| Auth | `POST /auth/{register,login,refresh,logout}`, `GET /auth/verify-email` |
| Users | `GET/PATCH /users/me`, `PATCH /users/me/password`, `DELETE /users/me` |
| Subscriptions | `GET /subscriptions/{me,usage}`, `POST /subscriptions/{upgrade,downgrade}` |
| AI Providers | `GET/POST /ai-providers`, `PATCH/DELETE /ai-providers/:id`, `GET /ai-providers/:id/health` |
| Chat | `GET/POST /chat/conversations`, `GET /chat/conversations/:id/messages`, `DELETE /chat/conversations/:id`, `POST /chat/send`, `GET /chat/send/stream` (SSE) |
| Search | `POST /search`, `GET /search/{history,recent,suggestions}` |
| Admin | `GET /admin/dashboard`, `GET /admin/system-health`, `GET/PATCH /admin/users*`, `GET/PATCH /admin/subscriptions*`, `GET/POST/PATCH/DELETE /admin/ai-providers*`, `GET /admin/{usage-analytics,logs}` |

Full request/response shapes, examples, and error codes are in Swagger —
that's the source of truth, not this table.

## No real AI provider keys required

OpenAI/Anthropic/Gemini and the web search adapter are all mocked — no
external accounts, API keys, or network calls needed to run or grade this.
Swapping in a real SDK later only means changing the body of an adapter's
`chat()`/`healthCheck()`/`search()`, not the interfaces around it. See
`../docs/memory.md` for the full reasoning.

## Testing

`npm run test:e2e` runs the full suite (auth, users, subscriptions,
ai-providers, chat, search, admin — one spec file per module) against
whatever `DATABASE_URL` points at. It reuses the dev database rather than a
separate disposable one; see `../docs/memory.md`'s Phase 10 entry for that
trade-off.

## Postman

A hand-written collection covering every module is at
[`../postman/echogpt.postman_collection.json`](../postman/echogpt.postman_collection.json).
Import it, set the `baseUrl` variable (defaults to
`http://localhost:3000/api/v1`), run **Auth → Register** or **Login**, and
the collection's test script saves `accessToken`/`refreshToken` into
collection variables automatically for the rest of the requests. The raw
OpenAPI spec (`/api/docs-json`) can also be imported directly into Postman
if you'd rather generate your own.
