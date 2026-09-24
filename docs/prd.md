# PRD — EchoGPT Backend API

## 1. Background

AppifyDevs internship assignment (Backend, NestJS). Build a production-shaped REST
API that could plausibly power the EchoGPT Chrome Extension (multi-AI chat + web
search assistant). Reference extension: EchoGPT — Multi AI Chat (Chrome Web Store).

Deadline: 2026-09-29.

## 2. Objective

Ship a NestJS + PostgreSQL + Swagger backend covering auth, user management,
subscriptions, AI-provider management, chat, web search, and an admin panel API
surface — with clean architecture, sane security defaults, and full OpenAPI docs.

## 3. Scope (from assignment brief)

### 3.1 Authentication
- Register, login, logout
- JWT access token + refresh token rotation
- Password hashing (bcrypt/argon2)
- Email verification (bonus, stubbed with a token + console/log "email")

### 3.2 User Management
- Get/update profile, change password, delete account (soft delete)
- Roles: `USER`, `ADMIN`

### 3.3 Subscription Management
- Plans: `FREE`, `PREMIUM`
- Subscription status endpoint, upgrade/downgrade
- Usage limits + "remaining requests" endpoint, enforced via a guard

### 3.4 AI Provider Management
- Providers: OpenAI, Anthropic (Claude), Google Gemini
- CRUD + enable/disable + set default
- API keys encrypted at rest (AES-256-GCM), never returned in responses
- Health-check endpoint per provider (lightweight ping, no real key required to pass build)

### 3.5 Chat API
- Send prompt → provider adapter → AI response (provider calls mocked/stubbed
  behind an interface so no real API keys are required to run the assignment)
- Provider selection per request (falls back to user's default)
- Conversation + message history, paginated
- Streaming response — bonus, via SSE

### 3.6 Web Search API
- Search query endpoint (stubbed provider, same adapter pattern as AI providers)
- Search history, recent searches, search suggestions
- Result caching — bonus (short-TTL DB or in-memory cache)

### 3.7 Admin Panel APIs
- Dashboard stats (user counts, active subscriptions, request volume)
- User management (list/search/disable/change role)
- Subscription management (list/override)
- AI provider management (global providers, not per-user)
- API usage analytics + request logs
- System health endpoint

## 4. Non-goals

- No real frontend. No real third-party API keys committed or required to run.
- No payment gateway integration — subscription changes are internal-only state
  transitions (a `paymentRef` field is modeled for future Stripe/SSLCommerz wiring).
- No multi-tenant/org support.
- No production Kubernetes/infra work — Docker Compose for local dev is enough.

## 5. Users / Roles

- **User**: registers, chats, searches, manages own subscription/profile.
- **Admin**: everything a user can do, plus admin endpoints under `/admin/*`,
  guarded by `RolesGuard`.

## 6. Success Criteria

- `npm run start:dev` + `docker compose up -d db` gets a working API locally
  with one `.env.example` copy.
- Every endpoint documented in Swagger at `/api/docs` with request/response
  DTOs, auth requirements, and example error responses.
- Prisma migrations reproduce the schema from zero.
- Core auth + chat + provider flows covered by e2e tests.
- Git history reads as a sequence of small, reviewable, working commits —
  not one giant dump.

## 7. Deliverables (per assignment brief)

- GitHub repository (this repo, pushed incrementally)
- `README.md` with setup instructions
- Prisma migration files (`server/prisma/migrations`)
- Swagger docs (served at runtime + optionally exported `openapi.json`)
- `.env.example`
- Postman collection (optional, bonus)

## 8. Open Questions / Assumptions

See `memory.md` §"Decisions & Assumptions" — logged there as they're made so
this PRD doesn't need to be rewritten mid-build.
