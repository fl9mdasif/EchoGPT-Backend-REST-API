# EchoGPT Backend

Backend REST API for the EchoGPT Chrome Extension — built with NestJS,
PostgreSQL, Prisma, and Swagger for the AppifyDevs backend internship
assignment (auth, users, subscriptions, AI providers, chat, web search,
and an admin panel).

Planning/decision docs: [`docs/prd.md`](docs/prd.md) ·
[`docs/architechture.md`](docs/architechture.md) ·
[`docs/tasks.md`](docs/tasks.md) · [`docs/rules.md`](docs/rules.md) ·
[`docs/memory.md`](docs/memory.md)

The application lives in [`server/`](server) — see
**[`server/README.md`](server/README.md)** for setup, scripts, the full API
route table, and testing instructions. A Postman collection is at
[`postman/echogpt.postman_collection.json`](postman/echogpt.postman_collection.json).

## Quick start

```bash
cd server
cp .env.example .env
npm install --legacy-peer-deps
docker compose up -d db          # Postgres on localhost:55432
npx prisma migrate dev
npx prisma db seed               # admin@echogpt.dev / demo@echogpt.dev, pw: ChangeMe123!
npm run start:dev                # http://localhost:3000/api/v1
```

Swagger UI: http://localhost:3000/api/docs

Full details — why port 55432, why `--legacy-peer-deps`, running the whole
stack in Docker, project layout — are in `server/README.md` and
`docs/memory.md`.

## Status

All 10 phases in `docs/tasks.md` are complete. Build/lint/e2e all pass
(build/lint via oxlint+tsc, e2e via Vitest+Supertest across one spec file
per module), and the API has been verified end-to-end through
`docker compose up -d --build` after every phase.
