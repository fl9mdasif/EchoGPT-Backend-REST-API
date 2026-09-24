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
- [ ] git init + first commit (docs)

## Phase 1 — Project scaffold
- [ ] `server/`: NestJS project (`@nestjs/cli` new app)
- [ ] Install: prisma, @nestjs/config, @nestjs/swagger, @nestjs/jwt,
      @nestjs/passport, passport-jwt, class-validator, class-transformer,
      bcrypt, helmet, @nestjs/throttler
- [ ] `PrismaModule` + `PrismaService` (global module)
- [ ] `ConfigModule` (typed, validated env schema via Joi/zod)
- [ ] Global `ValidationPipe`, `AllExceptionsFilter`, `TransformInterceptor`
- [ ] Swagger bootstrap at `/api/docs`
- [ ] `docker-compose.yml` (postgres + app)
- [ ] `.env.example`
- [ ] Health endpoint `GET /health`
- [ ] Commit: `chore: scaffold NestJS project with Prisma, Swagger, config`

## Phase 2 — Database schema
- [ ] `prisma/schema.prisma`: User, RefreshToken, Subscription, AiProvider,
      Conversation, Message, SearchQuery, ApiUsageLog + enums (Role, Plan,
      ProviderType, MessageRole)
- [ ] Initial migration
- [ ] Seed script (admin user + free plan defaults)
- [ ] Commit: `feat(db): initial prisma schema and migration`

## Phase 3 — Auth module
- [ ] Register, Login, Refresh, Logout endpoints
- [ ] Password hashing (bcrypt)
- [ ] JwtStrategy + JwtRefreshStrategy, guards
- [ ] Refresh token rotation + revocation
- [ ] Email verification stub (token generation + verify endpoint)
- [ ] Rate limiting on auth routes
- [ ] e2e: register → login → refresh → logout happy path
- [ ] Commit: `feat(auth): registration, login, jwt refresh, logout`

## Phase 4 — Users module
- [ ] `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/password`,
      `DELETE /users/me` (soft delete)
- [ ] `RolesGuard` + `@Roles()` decorator
- [ ] Commit: `feat(users): profile management and roles guard`

## Phase 5 — Subscriptions module
- [ ] `GET /subscriptions/me`, `POST /subscriptions/upgrade`,
      `POST /subscriptions/downgrade`, `GET /subscriptions/usage`
- [ ] `SubscriptionLimitGuard` (blocks chat/search when over limit)
- [ ] Commit: `feat(subscriptions): plans, usage limits, upgrade/downgrade`

## Phase 6 — AI Providers module
- [ ] Provider CRUD + enable/disable + set-default
- [ ] AES-256-GCM key encryption util + masking on read
- [ ] `ProviderRegistry` + adapter interface
- [ ] `OpenAiAdapter`, `AnthropicAdapter`, `GeminiAdapter` (mock-capable)
- [ ] `GET /ai-providers/:id/health`
- [ ] Commit: `feat(ai-providers): provider CRUD, key encryption, health check`

## Phase 7 — Chat module
- [ ] Conversations CRUD, messages nested + paginated
- [ ] `POST /chat/send` → adapter dispatch → persist + return
- [ ] Provider selection (explicit or user default)
- [ ] SSE streaming variant (bonus)
- [ ] Commit: `feat(chat): conversations, send prompt, provider dispatch`

## Phase 8 — Web Search module
- [ ] `POST /search`, `GET /search/history`, `GET /search/recent`,
      `GET /search/suggestions`
- [ ] Result caching (bonus)
- [ ] Commit: `feat(search): search query, history, suggestions`

## Phase 9 — Admin module
- [ ] `GET /admin/dashboard`
- [ ] User management (list/search/disable/change role)
- [ ] Subscription overrides
- [ ] Global AI provider management
- [ ] `GET /admin/usage-analytics`, `GET /admin/logs`
- [ ] `ApiUsageLog` write via a global interceptor
- [ ] `GET /admin/system-health`
- [ ] Commit: `feat(admin): dashboard, user/subscription/provider admin, logs`

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
