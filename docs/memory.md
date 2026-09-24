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
  e2e all pass locally. **Workflow note**: commits are made locally only —
  the user pushes to GitHub manually themselves; don't run `git push`.
  Next: Phase 2 (Prisma schema + migration).

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
