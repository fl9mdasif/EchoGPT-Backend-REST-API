# Memory — EchoGPT Backend

Running log of context, decisions, and assumptions for this build. Read this
before resuming work in a new session — it's the "what did we decide and why"
that isn't obvious from the code alone.

## Project facts

- Source: AppifyDevs "Software Engineering Internship (Backend) – Onsite"
  assignment. Deadline **2026-09-29**.
- Reference product: EchoGPT — Multi AI Chat Chrome extension (naming/feature
  inspiration only; no access to its real backend or API contracts).
- Candidate email for attribution: asif.ailabpro@gmail.com.
- Repo root: `echoGPT-chrome-extention/`. NestJS app lives in `server/`
  (kept separate from `docs/` so the docs aren't shipped inside the Nest
  build output).
- Not a git repo yet as of 2026-09-24 — will `git init` right after docs are
  in place, first commit = the five docs files.

## Decisions & Assumptions

- **No real AI provider keys required to run.** Adapters mock a response when
  no key is configured, so the grader can run the project with zero external
  accounts. This is explicit in code, not a silent stub.
- **No payment gateway.** Subscription upgrade/downgrade is an internal state
  change only (`Subscription.plan`), matching the brief's "Upgrade/Downgrade
  Subscription" API without requiring Stripe/SSLCommerz integration work that
  wasn't asked for.
- **Provider ownership model**: `AiProvider.ownerUserId` is nullable — null
  means a global/admin-managed provider, set means a user added their own
  key. This lets "Add Provider" (user-facing, §4 of brief) and "AI Provider
  Management" (admin-facing, §7) share one table instead of two.
- **Soft delete for users** (`deletedAt` timestamp) rather than hard delete —
  keeps `Conversation`/`Message`/`ApiUsageLog` foreign keys intact for admin
  analytics after a user deletes their account.
- **Refresh tokens stored hashed**, rotated on every use — standard mitigation
  against refresh-token replay, low extra cost.
- **ORM: Prisma over TypeORM** — faster to get a correct, type-safe schema
  under a hard deadline; migration story is simpler to explain in the README.

## Progress log

- 2026-09-24: Read assignment brief. Created `docs/prd.md`,
  `docs/architechture.md`, `docs/tasks.md`, `docs/rules.md`, this file.
  Next: `git init`, commit docs, then Phase 1 (Nest scaffold).
- 2026-09-24: Phase 1 done — `server/` scaffolded (Nest CLI generated Nest
  12 + Vitest 4 + TS 6 + ESM by default, not Jest — kept it, since it's
  what the current CLI ships and it works fine). Wired ConfigModule
  (validated), global PrismaModule, ValidationPipe, AllExceptionsFilter,
  TransformInterceptor (`{ data }` envelope), ThrottlerGuard, Helmet, CORS,
  Swagger at `/api/docs`, health endpoint at `/api/v1/health`. Verified the
  whole stack end-to-end via `docker compose up -d --build` (api + db) —
  health check and swagger JSON both respond correctly. Build, lint, and
  e2e all pass locally. **Workflow note (superseded — see next entry)**:
  commits were made locally by the assistant.
  Next: Phase 2 (Prisma schema + migration).
- 2026-09-24: **Workflow correction from the user.** Don't run `git add` /
  `git commit` / `git push` at all. After finishing a phase, hand the user a
  ready-to-copy shell block (`git add <files>`, `git commit -m "..."`,
  `git push`) and let them run it themselves — every phase, from here on.
  Also saved as a persistent feedback memory (`feedback_git_workflow`) so
  future sessions default to this without being told again.
- 2026-09-24: Phase 2 done — `prisma/schema.prisma` has all 8 models + 5
  enums from the architecture doc. Migration `20260924053458_init` applied.
  Seed script at `prisma/seed.ts` (admin + demo user + a default global
  OpenAI provider), runnable via `npm run prisma:seed` or
  `npx prisma db seed`. Build/lint/e2e all green. Next: Phase 3 (Auth
  module — register/login/refresh/logout).
- 2026-09-24: Phase 3 done — `src/auth/` module: register/login/refresh/
  logout/verify-email. Global `JwtAuthGuard` (via `APP_GUARD`) now protects
  every route by default; mark a route `@Public()` to exempt it (health and
  all of /auth are). Refresh/logout use a separate `jwt-refresh` passport
  strategy reading the token from the request body (not the Authorization
  header) via `ExtractJwt.fromBodyField('refreshToken')`, guarded
  explicitly with `JwtRefreshGuard` rather than the global guard. Refresh
  tokens: hashed (sha256) at rest in `RefreshToken`, rotated on every use
  (old one revoked, new row created), looked up by `jti` embedded in the
  JWT. 7 e2e tests cover the full happy path plus rotation-reuse and
  wrong-password/garbage-token failure cases. Verified against the
  dockerized stack (curl register → verify-email round trip, Swagger lists
  all 6 routes). Next: Phase 4 (Users module — profile, roles guard).

### Gotchas hit during Phase 3

- **`@nestjs/jwt`'s `expiresIn` type doesn't accept a plain `string`.**
  `JwtSignOptions['expiresIn']` is `number | StringValue` (a branded
  template-literal type from the `ms` package). Reading it from
  `ConfigService.get<string>(...)` needs an explicit
  `as JwtSignOptions['expiresIn']` cast at the call site — see
  `src/auth/auth.service.ts` `issueTokenPair()`.
- 2026-09-24: Phase 4 done — `src/users/` module: GET/PATCH `/users/me`,
  PATCH `/users/me/password` (revokes all other refresh tokens on change),
  DELETE `/users/me` (soft delete via `deletedAt` + revokes refresh tokens).
  Added `User.name` to the schema (nothing in Phase 2's model supported a
  display name) via migration `20260924055716_add_user_name`. Added
  `RolesGuard` + `@Roles()` decorator, registered globally — it's a no-op
  until a route actually declares `@Roles(...)`, which starts in Phase 9
  (admin). 6 e2e tests. Verified against the dockerized stack. Next: Phase
  5 (Subscriptions module).
- 2026-09-24 (gotcha, Phase 4): **`prisma migrate dev` didn't reliably
  regenerate the client type declarations this session** — after adding
  `User.name` and migrating, `npm run build` still failed with the new
  Prisma-typed `User` object missing `name`. An explicit `npx prisma
  generate` afterward fixed it. Same root shape as the Phase 2 "stale
  client" gotcha — when a build error mentions a field that's definitely in
  `schema.prisma`, regenerate explicitly before debugging further.
- 2026-09-24: Phase 5 done — `src/subscriptions/` module: GET
  `/subscriptions/me`, GET `/subscriptions/usage`, POST
  `/subscriptions/upgrade`, POST `/subscriptions/downgrade`. Plan limits
  (`PLAN_REQUEST_LIMITS`: FREE 50, PREMIUM 5000) live in
  `subscriptions.service.ts` — matches the numbers already used in
  `prisma/seed.ts` (duplicated, not cross-imported, since seed.ts sits
  outside `src/` and isn't part of the Nest build). Upgrade sets a fake
  30-day `renewsAt` (no payment gateway, per the Phase 0 assumption in this
  file). Built `SubscriptionLimitGuard` but haven't attached it to any
  route yet — nothing to gate until Chat/Search exist (Phase 7/8). 5 e2e
  tests. Verified against the dockerized stack. Next: Phase 6 (AI
  Providers module — provider CRUD, key encryption, health check).
- 2026-09-24: Phase 6 done — `src/ai-providers/` module. CRUD + health
  check for OpenAI/Anthropic/Gemini providers.
  - **Ownership model in practice**: `GET /ai-providers` returns a user's
    own providers (`ownerUserId = userId`) plus enabled global ones
    (`ownerUserId = null`, e.g. the seeded default). POST/PATCH/DELETE only
    ever touch a caller's own rows — global providers are admin-managed
    (Phase 9), not editable through this user-facing controller. Looking up
    a provider that's missing OR not owned by the caller both return 404
    (not 403), to avoid leaking which IDs exist.
  - **Key handling**: added `AiProvider.apiKeyPreview` (migration
    `add_ai_provider_key_preview`) alongside the existing
    `apiKeyEncrypted`, so list/detail reads never need to decrypt anything
    — the masked preview (`sk-a••••cdef`) is computed once at write time.
    The real key is decrypted only inside `healthCheck()`, in memory, right
    before handing it to the adapter.
  - **Adapters are fully mocked** (`MockProviderAdapterBase`, shared by all
    three) — no OpenAI/Anthropic/Gemini SDKs are called. This was already
    the Phase 0 assumption; Phase 6 is where it actually gets implemented.
    Swapping in real SDK calls later only means changing each adapter's
    `chat()`/`healthCheck()` body — the interface, registry, and controller
    don't change.
  - **`isDefault` is scoped per owner**: setting it clears any other
    default among that same user's own providers only, never touching
    global rows.
  7 e2e tests, including one that stringifies the whole response to assert
  the raw API key never appears anywhere in it. Verified against the
  dockerized stack. Next: Phase 7 (Chat module — conversations, send
  prompt, provider dispatch via `ProviderRegistryService`).
- 2026-09-24: Phase 7 done — `src/chat/` module: conversations CRUD,
  paginated message history, `POST /chat/send`, bonus SSE
  `GET /chat/send/stream`.
  - **Provider resolution** lives in `AiProvidersService.resolveForDispatch`
    (added this phase): explicit `providerId` on the request → the
    conversation's already-pinned provider → the user's own default →
    the global default → `BadRequestException` if nothing's configured.
    Whichever provider ends up used gets pinned onto the conversation (once)
    so a conversation keeps a consistent provider across turns.
  - **`SubscriptionLimitGuard` is finally attached** (built in Phase 5,
    unused until now) to both `/chat/send` and the SSE variant.
    `requestsUsed` increments by 1 per successful send, in the same
    transaction as persisting the assistant message.
  - **Pagination**: added `PaginationQueryDto` + `PaginationMetaDto` in
    `src/common/dto/`, reusable for Search (Phase 8) and Admin (Phase 9)
    list endpoints. List responses return `{ data, meta }` directly, which
    `TransformInterceptor` recognizes as already-enveloped and does not
    re-wrap — see the Phase 1 design note in that file.
  - **Real bug found+fixed this phase**: the global `TransformInterceptor`
    was wrapping SSE `MessageEvent`s too, burying `.type` inside a new
    `.data`, which silently broke the `event:` line the SSE stream writer
    emits (discovered via an e2e assertion, not by inspection — the
    dockerized curl smoke test wouldn't have caught it either, since it
    only checks `/health` and Swagger JSON, not response *content* for
    each route). Fix: `TransformInterceptor` now checks for `@Sse()`'s
    metadata key and passes those routes through untouched.
  - **Real design decision**: `/chat/send` and its SSE variant are now
    `@SkipThrottle()`'d. The generic global throttle (20 req/60s) and the
    subscription-based `SubscriptionLimitGuard` are two different rate
    limits with different intents; keeping the generic one on chat as well
    made an active chat session (naturally many requests/min) hit 429s from
    the wrong guard. Discovered via the e2e test that drains the FREE
    50-request quota — it started failing with 429 instead of the expected
    403 at request ~21, not because the test was wrong but because two
    real, independent protections were fighting each other.
  - **Adapter role casing**: `MessageRole` (Prisma enum) is
    `USER`/`ASSISTANT`/`SYSTEM`; `ChatMessage['role']` (adapter interface)
    is lowercase `'user'|'assistant'|'system'`. Conversion is a
    `.toLowerCase()` cast in `ChatService`, not a lookup table — the enum
    values line up exactly.
  10 e2e tests, including one that runs 50 real `/chat/send` calls to prove
  the plan limit actually blocks the 51st. Verified against the dockerized
  stack. Next: Phase 8 (Web Search module).
- 2026-09-24: **Workflow update.** After several phases of the hand-off
  workflow, the user said "complete 8,9,10 and push by u step by step" —
  explicit in-session authorization for the assistant to run
  `git add`/`commit`/`push` directly for these phases. Also saved to the
  persistent `feedback_git_workflow` memory as a noted exception, not a
  full reversal of the default (still hand off unless told otherwise).
- 2026-09-24: Phase 8 done — `src/search/` module: `POST /search`,
  `GET /search/history`, `GET /search/recent`, `GET /search/suggestions`.
  Mocked search (`SearchAdapterService`), same "no real external API"
  scope decision as the AI provider adapters. **Caching (bonus)**: an
  identical query string from the same user within a 5-minute window is
  served from the existing `SearchQuery.resultsJson` row instead of
  re-dispatching — implemented as a plain Prisma lookup (`findFirst` on
  `userId` + `query` + a `createdAt` cutoff), no new cache infrastructure.
  A cache hit does not increment `Subscription.requestsUsed`; a real
  search does (**scope decision, not explicitly required by the brief**:
  search counts against the same plan quota as chat, since both are
  AI-assisted requests per the brief's own framing). `/search` is also
  `@SkipThrottle()`'d for the same reason `/chat/send` is (Phase 7).
  7 e2e tests. Verified against the dockerized stack. Next: Phase 9
  (Admin module).

### Gotchas hit during Phase 2

- **Local Postgres port conflicts.** This machine already runs two native
  Windows `postgresql-x64-*` services bound to ports 5432 *and* 5433.
  docker-compose's db service host port had to move to **55432** (internal
  container port is still 5432, unaffected — `api`'s `DATABASE_URL` inside
  the compose network still says `db:5432`). If `prisma migrate dev` from
  the host gives `P1000: Authentication failed`, suspect a port clash with
  a native Postgres, not a real credentials problem — check
  `netstat -ano | grep ":<port>"` and `Get-Process -Id <pid>`.
- **Regenerate the Prisma client after editing schema.prisma.** `prisma
  migrate dev` is supposed to auto-regenerate, but in this session the
  client stayed stale (generated against the placeholder schema from Phase
  1, with `runtimeDataModel = {"models":{}, ...}` baked into
  `src/generated/prisma/internal/class.ts`) until an explicit
  `npx prisma generate` was run. Symptom: `prisma.user` (and every other
  model accessor) is `undefined` even though the client instantiates fine.
  If a model delegate is unexpectedly undefined, check that
  `internal/class.ts`'s `config.runtimeDataModel` actually lists your
  models before suspecting anything else.
- **`tsx prisma/seed.ts` doesn't load `.env` on its own** — only the Prisma
  CLI does that (via `prisma7.config.ts`). Any standalone script run with
  `tsx`/`node` needs its own `import 'dotenv/config'` at the top, or
  `process.env.DATABASE_URL` is `undefined` and `@prisma/adapter-pg` fails
  with a confusing `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must
  be a string` instead of a clear "missing env var" error.

### Gotchas hit during Phase 1 (useful if resuming cold)

- **npm 11 arborist bug**: `npm install` on this project's dependency graph
  (Vitest 4 / vite-tsconfig-paths / TS 6 peer deps) crashes with
  `Cannot read properties of null (reading 'edgesOut')`. Fixed by always
  installing with `--legacy-peer-deps`. Not a project bug — a known npm bug.
- **ESM everywhere**: `server/package.json` has `"type": "module"` and
  `tsconfig.json` uses `nodenext` resolution. Every relative import needs an
  explicit `.js` extension (e.g. `import { AppModule } from './app.module.js'`)
  even though the source file is `.ts`.
- **Prisma 7 requires a driver adapter.** The `prisma-client` generator (not
  the old `prisma-client-js`) no longer connects via a bundled query engine
  binary from a bare `DATABASE_URL` — `PrismaService` must construct
  `PrismaClient` with `new PrismaPg({ connectionString: ... })` from
  `@prisma/adapter-pg`, passed as the `adapter` option. Prisma init also
  names its config file `prisma7.config.ts` (not `prisma.config.ts`) and
  bundles `.claude/`, `.windsurf/`, `.agents/`, `skills-lock.json`
  "AI skill" folders on `prisma init` — deleted those, they're just AI-tool
  doc bundles, not needed to run the project.
- **class-transformer implicit conversion isn't automatic for numbers.**
  `ConfigModule`'s env validation (`src/config/env.validation.ts`) needs an
  explicit `@Type(() => Number)` on every numeric env var (`PORT`,
  `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`) — without it, `plainToInstance` left
  them as strings and `@IsInt()` failed validation even with
  `enableImplicitConversion: true`. Surfaced first inside the Docker
  container (env vars are always strings there), not locally.
- Two duplicate local `npm run start:dev` processes ended up running
  simultaneously earlier in this session (one from an interrupted
  background attempt) and never bound port 3000 — killed both via
  `taskkill`. If `curl localhost:3000` hangs with connection-refused,
  check `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` for
  stragglers before assuming the app itself is broken.

<!-- Append new dated entries below as phases land. Keep each entry short:
what shipped, what's next, anything a fresh session needs to know. -->
