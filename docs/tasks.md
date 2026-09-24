# Tasks — EchoGPT Backend

Living checklist. Each phase = one or more commits, pushed after it builds and
(where applicable) tests pass. Check items off as they land. Don't start a
phase's cleanup/polish items before its core functionality works end-to-end.

## Phase 0 — Planning
- [x] docs/prd.md
- [x] docs/architechture.md
- [x] docs/tasks.md (this file)
- [x] docs/rules.md
- [x] docs/memory.md
- [x] git init + first commit (docs)

## Phase 1 — Project scaffold
- [x] `server/`: NestJS project (`@nestjs/cli` new app)
- [x] Install: prisma, @nestjs/config, @nestjs/swagger, @nestjs/jwt,
      @nestjs/passport, passport-jwt, class-validator, class-transformer,
      bcrypt, helmet, @nestjs/throttler, @prisma/adapter-pg
- [x] `PrismaModule` + `PrismaService` (global module, pg driver adapter)
- [x] `ConfigModule` (typed, validated env schema via class-validator)
- [x] Global `ValidationPipe`, `AllExceptionsFilter`, `TransformInterceptor`
- [x] Swagger bootstrap at `/api/docs`
- [x] `docker-compose.yml` (postgres + app) — verified end-to-end
- [x] `.env.example`
- [x] Health endpoint `GET /api/v1/health` (+ e2e test)
- [x] Commit: `chore: scaffold NestJS project with Prisma, Swagger, config`

## Phase 2 — Database schema
- [x] `prisma/schema.prisma`: User, RefreshToken, Subscription, AiProvider,
      Conversation, Message, SearchQuery, ApiUsageLog + enums (Role, Plan,
      SubscriptionStatus, ProviderType, MessageRole)
- [x] Initial migration (`prisma/migrations/20260924053458_init`)
- [x] Seed script (admin user + demo user + default AI provider) —
      `npm run prisma:seed` or `npx prisma db seed`
- [x] Commit: `feat(db): initial prisma schema and migration`

## Phase 3 — Auth module
- [x] Register, Login, Refresh, Logout endpoints
- [x] Password hashing (bcrypt, cost 12)
- [x] JwtStrategy + JwtRefreshStrategy, guards (JwtAuthGuard global + @Public())
- [x] Refresh token rotation + revocation (hashed at rest)
- [x] Email verification stub (token generation + GET /auth/verify-email)
- [x] Rate limiting on auth routes (5/min via @Throttle)
- [x] e2e: register → duplicate 409 → login → wrong password 401 → refresh
      rotation → reused-token 401 → logout → post-logout 401 → garbage
      token 401 (7 tests, `test/auth.e2e-spec.ts`)
- [x] Commit: `feat(auth): registration, login, jwt refresh, logout`

## Phase 4 — Users module
- [x] `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`,
      `DELETE /users/me` (soft delete)
- [x] `RolesGuard` + `@Roles()` decorator (global no-op guard; will gate
      Phase 9 admin routes)
- [x] Added `User.name` (schema had no display-name field before this
      phase) — migration `20260924055716_add_user_name`
- [x] e2e: 401 unauthenticated → get profile → update name → wrong-password
      change 401 → change password (revokes sessions, old pw fails login,
      new pw works) → delete account (soft) → post-delete login 401
      (6 tests, `test/users.e2e-spec.ts`)
- [x] Commit: `feat(users): profile management and roles guard`

## Phase 5 — Subscriptions module
- [x] `GET /subscriptions/me`, `POST /subscriptions/upgrade`,
      `POST /subscriptions/downgrade`, `GET /subscriptions/usage`
- [x] `SubscriptionLimitGuard` (blocks chat/search when over limit) — built,
      not yet attached anywhere; wired up when Phase 7/8 add the routes it
      guards
- [x] e2e: 401 unauthenticated → new user defaults to FREE/ACTIVE/50 →
      usage matches (0 used, 50 remaining) → upgrade to PREMIUM (5000
      limit, renewsAt set) → downgrade back to FREE (5 tests,
      `test/subscriptions.e2e-spec.ts`)
- [x] Commit: `feat(subscriptions): plans, usage limits, upgrade/downgrade`

## Phase 6 — AI Providers module
- [x] Provider CRUD + enable/disable + set-default (POST/PATCH/DELETE
      `/ai-providers`, no separate toggle/set-default routes — folded into
      PATCH's DTO, standard REST, avoids redundant endpoints)
- [x] AES-256-GCM key encryption util + masking on read (`apiKeyPreview`
      column, raw key never stored in plaintext or returned in any DTO)
- [x] `ProviderRegistryService` + `AiProviderAdapter` interface
- [x] `OpenAiAdapter`, `AnthropicAdapter`, `GeminiAdapter` (share a
      `MockProviderAdapterBase` — mock-only, see docs/memory.md)
- [x] `GET /ai-providers/:id/health`
- [x] e2e: 401 unauthenticated → seeded global provider visible → create
      (key never echoed back, masked correctly) → update/disable → health
      check → 404 on someone else's/missing id → delete (7 tests,
      `test/ai-providers.e2e-spec.ts`)
- [x] Commit: `feat(ai-providers): provider CRUD, key encryption, health check`

## Phase 7 — Chat module
- [x] Conversations CRUD (list/create/delete), messages nested + paginated
      (`{data, meta}` shared with Subscriptions/AI-providers-style lists)
- [x] `POST /chat/send` → adapter dispatch → persist + return
- [x] Provider selection: explicit `providerId` → conversation's stored
      provider → user's default → global default → 400 if none
- [x] `SubscriptionLimitGuard` finally attached (Phase 5 built it unused) —
      403 once `requestsUsed >= requestsLimit`; `requestsUsed` increments
      on every successful send
- [x] SSE streaming variant (bonus) — `GET /chat/send/stream`, emits
      `conversation`/`chunk`/`done` events
- [x] e2e: 401 → empty list → send (implicit conversation) → list shows it
      → paginated messages → second send reuses conversation + usage
      increments → SSE stream → 404 on bad conversation id → 50-request
      FREE-limit exhaustion → 403 on the 51st → delete (10 tests,
      `test/chat.e2e-spec.ts`)
- [x] Commit: `feat(chat): conversations, send prompt, provider dispatch`

## Phase 8 — Web Search module
- [x] `POST /search`, `GET /search/history`, `GET /search/recent`,
      `GET /search/suggestions`
- [x] Result caching (bonus) — identical query from the same user within
      5 minutes is served from the cache, doesn't count against usage
- [x] e2e: 401 → search (uncached) → repeat search (cached, usage
      unchanged) → history → recent → suggestions match → empty-prefix
      suggestions (7 tests, `test/search.e2e-spec.ts`)
- [x] Commit: `feat(search): search query, history, suggestions`

## Phase 9 — Admin module
- [x] `GET /admin/dashboard`
- [x] User management: `GET /admin/users` (search), `PATCH /admin/users/:id`
      (role, disable/reactivate)
- [x] `PATCH /admin/subscriptions/:userId` overrides (+ `GET` list)
- [x] Global AI provider management (`GET/POST/PATCH/DELETE
      /admin/ai-providers`, delegates to `AiProvidersService`'s new
      `*Global` methods)
- [x] `GET /admin/usage-analytics`, `GET /admin/logs`
- [x] `ApiUsageLog` write via a global interceptor (`UsageLoggingInterceptor`)
- [x] `GET /admin/system-health` (DB ping + uptime)
- [x] All `/admin/*` routes gated by `@Roles(Role.ADMIN)` (RolesGuard,
      global since Phase 4, finally exercised)
- [x] e2e: 403 non-admin → dashboard → system-health → list/search users →
      disable blocks login → reactivate restores it → subscriptions
      list+override → global provider CRUD → usage-analytics → logs
      (9 tests, `test/admin.e2e-spec.ts`, using the seeded admin account)
- [x] Commit: `feat(admin): dashboard, user/subscription/provider admin, logs`

## Phase 10 — Docs, tests, polish
- [ ] Swagger: examples + error responses on every route
- [ ] README.md: setup, run, migrate, seed, test instructions
- [ ] Postman collection export (optional)
- [ ] e2e coverage for each module's happy path
- [ ] Final review pass against docs/rules.md checklist
- [ ] Commit: `docs: finalize README, swagger examples, postman collection`

## Backlog / stretch (only if time remains before 2026-09-29)
- [ ] Streaming chat over SSE polish
- [ ] Search result caching with TTL
- [ ] GitHub Actions CI (lint + test on push)
