# Copilot / AI agent instructions for Cotana

This file contains focused, actionable guidance so an AI coding agent can be productive quickly.

1) High-level architecture
- **Frontend (Next.js app router):** the UI lives in [app](app) using the Next 13 app router. Pages and layouts are `.tsx` server/client components.
- **API routes:** route handlers follow the `route.ts` pattern under [app/api](app/api) (e.g. [app/api/incentives/route.ts](app/api/incentives/route.ts)). Follow the same request/response handlers shape.
- **Database:** Postgres via Prisma. Schema is at [prisma/schema.prisma](prisma/schema.prisma). Use the shared Prisma client exported from [services/prisma.ts](services/prisma.ts) (singleton on `globalThis`).
- **Business logic / integrations:** shared backend logic lives in `services/` (e.g. [services/localModel.ts](services/localModel.ts), [services/smartMoneyLive.ts](services/smartMoneyLive.ts)). Add new cross-cutting logic here rather than embedding in route handlers.
- **Background jobs & ingestion:** background workers and ingest pipelines live under `worker/` and `scripts/`; jobs use `bullmq`/Redis and can be standalone Node/TS processes.

2) Common developer workflows (commands)
- Start dev server: `npm run dev` (See [package.json](package.json)).
- Build: `npm run build` and `npm run start` for production.
- One-off scripts: run TypeScript scripts with `tsx` (examples in the `scripts/` folder; see `alerts:*` scripts in [package.json](package.json)). Example: `npx tsx scripts/onchain-alerts.ts`.
- Prisma migrations: update `prisma/schema.prisma` and run `npx prisma migrate dev --name <desc>` in development; production migrations use `npx prisma migrate deploy` and `npx prisma generate` as appropriate.

3) Project-specific patterns and conventions
- **Prisma singleton:** always import the `prisma` export from [services/prisma.ts](services/prisma.ts) to avoid connection blow-up in dev (it uses `globalThis`).
- **Route handler shape:** route files export Request handlers (`GET`, `POST`, etc.) in Next 13 `route.ts` style. Mirror existing handlers under [app/api](app/api).
- **Services layer:** prefer creating small composable functions in `services/` and call them from `app/api/*/route.ts` handlers. Avoid duplicating data-access code across handlers.
- **One-off scripts:** place ad-hoc scripts in `scripts/` and make them runnable via `tsx` so developers can run them without a build step.
- **Uploads:** user uploads are stored under `public/uploads` and served statically — use [app/api/uploads/route.ts](app/api/uploads/route.ts) for uploads handling.
- **Local LLM fallback:** summarization uses a local LLM endpoint controlled by env vars in [services/localModel.ts](services/localModel.ts): `LOCAL_LLM_ENDPOINT` and `LOCAL_LLM_MODEL`.

4) Environment and integrations
- Required env vars: `DATABASE_URL` (Prisma), `NEXTAUTH_SECRET` (auth), and optional `LOCAL_LLM_ENDPOINT` / `LOCAL_LLM_MODEL` for local LLM usage. See [prisma/schema.prisma](prisma/schema.prisma) and `.env` references.
- External services used: Redis (`ioredis`), BullMQ for queues, DeFiLlama integrations (see `scripts/` and `services/`), and Prisma/Postgres.

5) When editing or adding code — checklist for AI edits
- Use TypeScript and follow the existing style; do not introduce untyped JS.
- Put shared logic into `services/` and DB access through `prisma`.
- Match the `route.ts` handler signatures and return JSON responses consistent with neighboring handlers.
- For DB schema changes, update `prisma/schema.prisma` and include a `prisma migrate` command in the PR description.
- Keep server-only code (Node APIs, `fs`, secret envs) inside `app/server`/`services` or route handlers — avoid importing them into client components.

6) Useful example references
- Prisma singleton: [services/prisma.ts](services/prisma.ts)
- API route example: [app/api/incentives/route.ts](app/api/incentives/route.ts)
- Local LLM summarizer: [services/localModel.ts](services/localModel.ts)
- DB schema: [prisma/schema.prisma](prisma/schema.prisma)
- Dev scripts: [scripts](scripts) and `package.json` scripts

If anything above is unclear or you want more examples (for a specific area such as auth, uploads, or workers), tell me which part to expand and I will update this file.
