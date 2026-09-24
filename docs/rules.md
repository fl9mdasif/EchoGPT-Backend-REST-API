# Rules — EchoGPT Backend

Working conventions for this build. When in doubt, follow these over
improvising — consistency matters more than any single file's "best" style.

## Git / commits

- Small, working commits — one phase (or a clear sub-slice of one) per commit.
  Never commit code that doesn't build.
- Conventional commit prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`,
  `test`. Scope in parens when useful: `feat(auth): ...`.
- Commit message says *why* a decision was non-obvious, not just what changed
  (the diff already shows what changed).
- No secrets, `.env`, `node_modules`, or `dist` ever committed — enforced via
  `.gitignore` from the first commit.
- Push after each phase compiles and (once tests exist) passes.

## Code style

- TypeScript strict mode on. No `any` unless justified with a comment.
- ESLint + Prettier (Nest defaults), run on save / pre-commit.
- One class per file, file name matches class in kebab-case
  (`ai-provider.service.ts`).
- DTOs are classes (not interfaces) — required for `class-validator` +
  Swagger's `@ApiProperty` reflection to work.
- No business logic in controllers. No direct `PrismaClient` use outside
  `PrismaService` consumers.
- Prefer composition via Nest DI over inheritance.
- Don't add abstractions (factories, generic repositories, etc.) beyond what
  the current phase needs — three provider adapters justify an adapter
  interface; a hypothetical fourth doesn't justify more than that.

## Security

- Every route is `@UseGuards(JwtAuthGuard)` by default; only auth
  (register/login/refresh) and `/health` are public — mark public routes
  explicitly with a `@Public()` decorator so it's an opt-in, not an oversight.
- Validate all input (`ValidationPipe` global, `whitelist: true`).
- Never log passwords, tokens, or provider API keys — redact in any logging
  interceptor.
- Provider API keys: encrypted at rest, masked on every read path, decrypted
  only at the point of dispatching a provider call.
- Rate-limit auth endpoints and chat/search endpoints (throttler).

## Error handling

- Throw Nest's built-in `HttpException` subclasses (`BadRequestException`,
  `UnauthorizedException`, `NotFoundException`, etc.) from services — don't
  invent a parallel error system.
- Global `AllExceptionsFilter` guarantees a consistent JSON error shape even
  for unhandled exceptions.
- Don't swallow errors. Don't add try/catch that just rethrows without adding
  context or narrowing behavior.

## Testing

- Unit test service logic where there's a branch worth covering (guards,
  limit checks, token rotation) — not getters/setters or pure passthroughs.
- e2e (Supertest) covers each module's primary happy path plus one auth
  failure case (401/403) per protected route group.
- Tests run against a disposable test database (docker-compose service or
  a Postgres schema reset in `beforeAll`), never against dev data.

## Swagger

- Every controller: `@ApiTags`. Every route: `@ApiOperation`,
  `@ApiResponse` for 200/201 and the realistic error codes, `@ApiBearerAuth`
  where auth is required.
- DTOs carry `@ApiProperty` with `example` values — Swagger UI should be
  usable to manually test the API without reading the code.

## Scope discipline

- Follow `docs/tasks.md` phase order. Don't jump ahead to admin analytics
  before auth + chat work end-to-end.
- Bonus items (email verification, streaming, search caching, Postman
  collection) are last — only after every required item in the brief has a
  working endpoint.
- If a requirement is ambiguous, make the pragmatic call and log it in
  `docs/memory.md` under Decisions & Assumptions rather than blocking on it.
