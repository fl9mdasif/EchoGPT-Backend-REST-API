# Architecture — EchoGPT Backend

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | NestJS (Express adapter) | Assignment requirement; modular DI fits clean architecture |
| ORM | Prisma | Type-safe, fast migrations, good DX for a solo build under deadline |
| DB | PostgreSQL | Assignment requirement |
| Auth | Passport + `@nestjs/jwt` | Access + refresh token pattern, standard in Nest ecosystem |
| Docs | `@nestjs/swagger` | Assignment requirement, decorator-driven, stays in sync with DTOs |
| Validation | `class-validator` / `class-transformer` | Pairs with Nest's `ValidationPipe`, generates accurate Swagger schemas |
| Secrets | `@nestjs/config` + `.env` | 12-factor config |
| Containerization | Docker + docker-compose | Local Postgres + app, optional but recommended |
| Testing | Vitest (unit) + Supertest (e2e) | Nest CLI's current default toolchain |

## 2. Repo layout

```
echoGPT-chrome-extention/
├── docs/                 PRD, architecture, tasks, rules, memory
├── server/               NestJS app (this is what gets deployed)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/            guards, interceptors, decorators, filters, pipes
│   │   ├── config/            typed config module
│   │   ├── prisma/            PrismaModule + PrismaService
│   │   ├── auth/               register/login/refresh/logout, JWT strategies
│   │   ├── users/               profile CRUD, change password, delete account
│   │   ├── subscriptions/       plans, usage limits, upgrade/downgrade
│   │   ├── ai-providers/        provider CRUD, key encryption, health check
│   │   ├── chat/                conversations, messages, provider adapters
│   │   ├── search/               web search endpoints, history, caching
│   │   └── admin/                dashboard, user/sub/provider admin, logs
│   ├── test/                    e2e specs
│   ├── .env.example
│   ├── docker-compose.yml
│   └── Dockerfile
└── README.md
```

Each feature folder follows the same internal shape:
`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/` (Prisma
types are reused directly where possible — no redundant entity classes).

## 3. Layering / clean architecture

- **Controller** — HTTP concerns only: route, auth decorators, DTO validation,
  Swagger annotations. No business logic.
- **Service** — business logic, orchestrates Prisma + other services.
- **PrismaService** — the only place raw DB access happens. Feature services
  depend on it via DI, never instantiate `PrismaClient` themselves.
- **Guards** — `JwtAuthGuard`, `RolesGuard`, `SubscriptionLimitGuard` — cross
  cutting, applied via decorators (`@Roles()`, `@UseGuards()`).
- **Interceptors** — response shaping (`TransformInterceptor` for a consistent
  `{ data, meta }` envelope), logging.
- **Filters** — `AllExceptionsFilter` → consistent error JSON shape
  (`{ statusCode, message, error, path, timestamp }`).

## 4. AI Provider abstraction

```
interface AiProviderAdapter {
  key: 'openai' | 'anthropic' | 'gemini';
  chat(messages: ChatMessage[], opts): Promise<ChatResult>;
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>;
}
```

- Concrete adapters (`OpenAiAdapter`, `AnthropicAdapter`, `GeminiAdapter`) live
  in `ai-providers/adapters/`, registered in a small `ProviderRegistry`.
- Without a real key configured, an adapter returns a deterministic mock
  response so the assignment is fully runnable offline — this is explicit in
  the adapter (`if (!apiKey) return mockResponse(...)`), not a hidden hack.
- `ai-providers` module owns provider *configuration* (CRUD, enable/disable,
  default, encrypted key storage). `chat` module owns *usage* (send prompt,
  pick adapter, persist message).
- Provider API keys are encrypted with AES-256-GCM using a server-side
  `ENCRYPTION_KEY` env secret; decrypted only in-memory when dispatching a
  request, never logged, never serialized in any DTO.

## 5. Database schema (high level)

```
User            (id, email, passwordHash, role, isEmailVerified, createdAt, ...)
RefreshToken    (id, userId, tokenHash, expiresAt, revokedAt)
Subscription    (id, userId, plan, status, requestsUsed, requestsLimit, renewsAt)
AiProvider      (id, name, type, apiKeyEncrypted, isEnabled, isDefault, ownerUserId?)
Conversation    (id, userId, title, providerId, createdAt)
Message         (id, conversationId, role, content, tokensUsed, createdAt)
SearchQuery     (id, userId, query, resultsJson, createdAt)
ApiUsageLog     (id, userId, endpoint, method, statusCode, latencyMs, createdAt)
```

Full column-level design lives in `server/prisma/schema.prisma` — this is
the source of truth once the project is scaffolded; this doc stays at the
ER-diagram level of detail so it doesn't rot as fields get added.

Relations: `User 1—1 Subscription`, `User 1—N RefreshToken`,
`User 1—N Conversation 1—N Message`, `User 1—N SearchQuery`,
`User 1—N ApiUsageLog`, `AiProvider N—1 User` (nullable owner = global/admin
provider vs. a user-added one, per assignment's "Add Provider" as a user
facing feature).

## 6. Auth flow

1. `POST /auth/register` → hash password, create `User` + default `FREE`
   `Subscription`.
2. `POST /auth/login` → verify password → issue short-lived access JWT (15m)
   + long-lived refresh token (7d, stored hashed in `RefreshToken`).
3. `POST /auth/refresh` → validate refresh token against stored hash, rotate
   it (revoke old, issue new) — standard refresh-token-rotation to limit
   replay risk.
4. `POST /auth/logout` → revoke the refresh token.
5. `JwtStrategy` validates the access token on protected routes;
   `JwtRefreshStrategy` is a separate strategy scoped only to `/auth/refresh`.

## 7. API conventions

- Base path: `/api/v1`.
- Swagger UI at `/api/docs`, JSON at `/api/docs-json`.
- Pagination: `?page=1&limit=20` → `{ data: [...], meta: { page, limit, total } }`.
- Errors: standard Nest `HttpException` shape via a global exception filter.
- All mutating endpoints validate input via DTOs (`class-validator`);
  unknown properties stripped (`whitelist: true`, `forbidNonWhitelisted: true`).
- Versioning via URL prefix now; header-based versioning is a documented
  future option, not built (YAGNI for this assignment).

## 8. Security baseline

- Helmet, CORS allow-list, rate limiting (`@nestjs/throttler`) on auth routes.
- Passwords: bcrypt, cost factor 12.
- JWT secrets, DB creds, encryption key all via env, never committed
  (`.env` gitignored, `.env.example` committed with placeholders).
- Role checks via guard, not inline `if (user.role === 'admin')` scattered
  across controllers.
- Provider API keys encrypted at rest; admin/user responses never echo them
  back (masked as `sk-••••1234`).
