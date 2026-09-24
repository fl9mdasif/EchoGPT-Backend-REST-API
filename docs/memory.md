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

<!-- Append new dated entries below as phases land. Keep each entry short:
what shipped, what's next, anything a fresh session needs to know. -->
