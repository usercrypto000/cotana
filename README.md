# Cotana

Cotana is a discovery channel for people and AI agents. The product still feels like a mainstream consumer marketplace for human users, while agents can query a structured registry to find dapps with real machine-usable capabilities. Cotana does not execute downstream app actions or handle agent credentials.

## Current status

The repo now includes a working Phase 1 foundation plus the full Phase 2 discovery layer.

Implemented today:

- Privy auth in `apps/store` and `apps/admin`
- Privy DID to local `User` and `UserProfile` sync
- session-based admin authorization and admin route protection
- production-oriented Prisma schema with custom pgvector migrations
- admin CRUD for apps, publishing, moderation, changelog entries, and editorial shelves
- public store pages backed by PostgreSQL data instead of demo fixtures
- likes, private library saves, and app-view tracking
- review eligibility enforcement, review creation, review flagging, and admin moderation queue
- embedding generation with provider abstraction and pgvector retrieval
- category-aware reranking backed by configurable weights in `ConfigKV`
- editorial shelves on the homepage and category pages
- deterministic trending and rising sections with stored debug snapshots
- search filters and sort controls for relevance, highest rated, most reviewed, trending, and newest
- similar apps on app detail pages
- changelog and updates feed on app detail pages
- discovery-only agent registry with capability manifests
- agent capability taxonomy and compatibility reporting for outside agents
- per-capability manifests, registry policy, and `llms.txt` for machine discovery
- Phase 4 registry quality: capability quality scores, seeded agent intent tests, readiness buckets, public trust badges, and persisted search evaluation logs
- Phase 4.5 registry QA foundations: admin evaluation-log inspection, intent test run history and regression comparison, trust trend helpers, capability distribution, weak metadata fixtures, and internal health export
- Phase 4.6 registry contract stability: explicit public registry version metadata, manifest versions, registry change history, deprecation semantics, public machine-client docs, stronger schema contracts, and deterministic compatibility confidence
- verified badges and computed community-pick badges
- weekly historical signal snapshots plus discovery insight snapshots
- Inngest jobs for embeddings, signals, snapshots, trending, rising, and community picks
- Redis-backed caching, counters, and rate limiting with an in-memory fallback for development
- PostHog server-side analytics for search, shelves, discovery clicks, badges, updates, likes, saves, reviews, and auth
- Vitest coverage for the core Phase 2 discovery logic
- Vitest coverage for the first agent-registry and agent-aware embedding logic

## Product rules

- No visible wallet connection flow
- No wallet addresses or seed phrase UX
- No blockchain-native language in user-facing copy
- No chain tags on public app cards
- No developer portal
- No developer self-submission flow
- Admins are the only people who approve, add, edit, publish, and archive apps
- Public app cards show only logo, name, verified mark, one-line description, star rating, and category

User profiles stay minimal. They can show saved apps, likes, reviews, and lightweight eligibility state, with small additions such as featured apps left as optional future profile polish.

## Stack

- Monorepo: pnpm workspaces + Turbo
- Apps: Next.js App Router, TypeScript, Tailwind CSS
- Shared packages: `db`, `ui`, `config`, `search`, `auth`, `analytics`, `types`
- Data: PostgreSQL, Prisma, pgvector, Redis
- Auth: Privy
- Jobs: Inngest
- Analytics: PostHog
- Deploy target: Vercel
- Data providers: DeFiLlama, Covalent/GoldRush readiness
- Embeddings: provider abstraction with OpenAI as the default implementation target
- Brand system: blue-led Cotana tokens with Ubuntu headings, Open Sans body text, and Inter fallback only

## Repository layout

```text
/
  apps/
    store/
    admin/
  packages/
    db/
    ui/
    config/
    search/
    auth/
    analytics/
    types/
  docs/
  .github/
```

## Phase 2 discovery model

Cotana now has three discovery layers beyond the base semantic search pipeline:

- Editorial shelves: admin-managed collections with ordered shelf items, publish/archive states, optional category scoping, and homepage pinning
- Trending: a deterministic score built from recent view velocity, search CTR, like velocity, review velocity, and signal momentum
- Rising: a separate deterministic score built from growth rates in views, clicks, likes, reviews, plus signal momentum and a low-history boost

## Hybrid Agent Discovery

Apps can be marked as `HUMAN`, `AGENT`, or `HYBRID`. Agent registry visibility is controlled separately through `agentListingStatus`, which can be `NOT_APPLICABLE`, `DRAFT`, `PUBLISHED`, or `PAUSED`.

Only `PUBLISHED` agent listings appear in the registry. A listing cannot publish unless it has an agent summary and at least one active capability with an endpoint or docs URL, input and output schemas, and safety notes.

Agent registry search uses the same embedding foundation as the public store, but ranks capabilities instead of app cards. Results include the matched capability, semantic similarity, score, and a short explanation of why the capability matched the agent intent.

Outside agents can pass compatibility filters so Cotana only returns surfaces they can use. Supported filters are `auth`, `interface`, and `interaction`.

Agents can inspect `/api/agent-registry/capabilities` to understand the live capability taxonomy and `/api/agent-registry/compatibility` to check whether their auth, interface, and interaction constraints have coverage before running a semantic intent search.

Phase 4 hardens registry quality without adding execution. Capability results now carry quality signals and a `0-100` quality score based on schema completeness, docs availability, endpoint presence, safety notes, auth friction, latency tier, reliability tier, and interaction mode. Agent searches produce evaluation logs with query, filters, matched capability, score, similarity, excluded candidates, and blocking issue count.

Phase 4.5 deepens internal registry QA. Admins can filter evaluation logs by date, query, category, capability type, auth/interface/interaction mode, readiness bucket, matched app, and blocking issue count, then inspect a single log in detail. Seeded intent tests persist run versions, top results, scores, quality scores, pass/fail state, and failure reasons, with latest-vs-previous regression buckets. Internal helpers expose capability quality, trust signals, discovery scores, signal availability, and missing metadata trends. The registry health export is admin-only and remains separate from the public machine-readable registry.

Phase 4.6 makes the public machine-readable registry safer to depend on. Major registry endpoints now share `schemaVersion`, `registryVersion`, `generatedAt`, discovery-only boundary metadata, and supported endpoint metadata from a single config constant. App and capability manifests expose manifest versions and review/deprecation metadata. Admin saves create registry-sensitive change logs for audience, listing status, compatibility fields, schemas, docs, safety notes, and reliability metadata. Deprecated capabilities are excluded from default search but remain explainable through direct manifest reads. Public docs live at `/agent-registry/docs`, and `/api/agent-registry/schema` now describes the main response contracts.

The admin discovery page now includes operational readiness buckets, seeded intent tests, and recent registry evaluation logs. Public app detail pages show subtle machine-readable trust signals only inside the detail surface, not on public cards.

Public endpoints:

- `GET /.well-known/cotana-agent-registry`
- `GET /api/agent-registry`
- `GET /api/agent-registry/[slug]`
- `GET /api/agent-registry/[slug]/capabilities/[capabilitySlug]`
- `GET /api/agent-registry/search?q=...`
- `GET /api/agent-registry/schema`
- `GET /api/agent-registry/categories`
- `GET /api/agent-registry/capabilities`
- `GET /api/agent-registry/compatibility`
- `GET /api/agent-registry/policy`
- `GET /api/agent-registry/stats`
- `GET /llms.txt`

Example:

```txt
GET /api/agent-registry/search?q=yield%20rates&auth=NONE,API_KEY&interface=HTTP_API,MCP_SERVER&interaction=READ_ONLY
```

The human card surface remains minimal. Agent metadata appears only on detail pages and through machine-readable discovery endpoints.

Community pick is computed monthly from:

- rating quality
- review count quality
- like velocity
- engagement quality
- moderation safety

The discovery formulas and thresholds are stored in `ConfigKV` under:

- `discovery.weights.trending`
- `discovery.weights.rising`
- `discovery.weights.community_pick`

Search ranking weights remain separately configurable under:

- `ranking.weights.default`
- `ranking.weights.defi`
- `ranking.weights.lending-yield`
- `ranking.weights.prediction-markets`

## Database and migrations

The Prisma schema lives at [packages/db/prisma/schema.prisma](/C:/Users/HP/cotana/packages/db/prisma/schema.prisma).

Current production migrations include:

- [packages/db/prisma/migrations/20260328173000_initial_vertical_slice/migration.sql](/C:/Users/HP/cotana/packages/db/prisma/migrations/20260328173000_initial_vertical_slice/migration.sql)
- [packages/db/prisma/migrations/20260331154500_phase2_editorial_shelves/migration.sql](/C:/Users/HP/cotana/packages/db/prisma/migrations/20260331154500_phase2_editorial_shelves/migration.sql)
- [packages/db/prisma/migrations/20260331191500_phase2_discovery_and_updates/migration.sql](/C:/Users/HP/cotana/packages/db/prisma/migrations/20260331191500_phase2_discovery_and_updates/migration.sql)

Those migrations cover:

- `CREATE EXTENSION IF NOT EXISTS vector`
- the full Phase 1 schema
- editorial shelves and ordered shelf items
- app updates and changelog entries
- discovery insight snapshots for trending, rising, and community-pick debugging
- app verification notes and community-pick metadata
- historical signal snapshots for future charting

## Seed behavior

The seed script now creates:

- the fixed category taxonomy from the implementation brief
- an admin user from `ADMIN_ALLOWLIST_EMAIL`
- a broader launch-ready catalog across DeFi, Lending & Yield, Prediction Markets, Trading, Social, Gaming, Identity, Staking, and RWA
- app tags, sample signal rows, screenshots, app updates, public reviews, likes, views, search clicks, and verified-note metadata
- editorial shelves including `featured`, `best-for-beginners`, `prediction-markets-to-watch`, and `new-this-week`
- stored trending, rising, and community-pick discovery snapshots recomputed from seeded activity
- default ranking and discovery config rows in `ConfigKV`
- optional weak agent metadata fixtures when `COTANA_SEED_WEAK_AGENT_FIXTURES=true`
- optional launch catalog expansion across Payments, Wallets, Staking, RWA, Launchpads, and registry QA edge cases when `COTANA_SEED_LAUNCH_CATALOG=true`

Run it with:

- `pnpm db:seed`
- `pnpm seed:local` for local setup
- `COTANA_STAGING_SEED_CONFIRM=true pnpm seed:staging` for staging launch fixtures

After seed, the homepage should show a populated spotlight shelf, trending apps, rising apps, and category rows. App detail pages should show screenshots, reviews, updates, similar apps, and trust states. Admins can verify this at `/launch-checklist` through the public seed visibility panel.

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and Redis locally.
3. Fill in Privy, PostHog, OpenAI, Inngest, and provider credentials as needed.
4. Install dependencies with `pnpm install`.
5. Generate Prisma client with `pnpm db:generate`.
6. Apply migrations with `pnpm db:migrate`.
7. Seed the database with `pnpm db:seed`.
8. Run both apps with `pnpm dev`.

Store runs on [http://localhost:3000](http://localhost:3000). Admin runs on [http://localhost:3001](http://localhost:3001).

## Useful scripts

- `pnpm dev`
- `pnpm dev:store`
- `pnpm dev:admin`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:smoke`
- `pnpm test:e2e`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:migrate:deploy`
- `pnpm db:seed`
- `pnpm catalog:import ./catalog.json`
- `pnpm seed:local`
- `COTANA_STAGING_SEED_CONFIRM=true pnpm seed:staging`
- `pnpm seed:reset-local`

## Automated coverage

Vitest currently covers:

- editorial shelf shaping logic
- trending, rising, and community-pick formulas
- changelog/update CRUD helpers
- signal snapshot helper behavior
- search sorting and similar-app reranking helpers
- trust badge rendering
- catalog coverage audit, public registry readiness metadata, manifest warnings, and registry red-team runs
- environment validation, deployment health payloads, launch checklist aggregation, seed guards, and launch smoke routes
- production deployment targets, migration preflight helpers, catalog import validation, and beta E2E command plumbing

The test entrypoint is:

- `pnpm test`

## Build status

Current validation is green:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The current build still emits a non-fatal Privy warning about the optional `@farcaster/mini-app-solana` dependency during Next builds in both apps.

## Phase 4.8 staging launch readiness

Staging readiness now includes:

- non-throwing environment validation for database, Privy, Redis, PostHog, Inngest, OpenAI, URLs, registry URL, admin allowlist, provider keys, invalid URLs, invalid booleans/numbers, and local fallbacks
- public-safe health endpoints at store `/api/health`, registry `/api/agent-registry/health`, and admin `/api/health`
- admin-only diagnostics at `/environment-health`, `/launch-checklist`, `/api/admin/environment-health`, `/api/admin/jobs/health`, and `/api/admin/launch-checklist`
- separate seed workflows: `pnpm seed:local`, `COTANA_STAGING_SEED_CONFIRM=true pnpm seed:staging`, and `pnpm seed:reset-local`
- smoke checks through `pnpm test:smoke`

## Phase 4.9 production preview

Production preview uses GitHub repo `usercrypto000/cotana`, Vercel store project `cotana`, production domain `https://cotana.xyz`, and protected admin project `cotana-admin`. Current beta preview URLs are `https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app` for store and `https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app` for admin.

Beta health supports four statuses:

- `ok`
- `ok_with_warnings`
- `degraded`
- `unhealthy`

Vercel preview can return `ok_with_warnings` when the database is reachable and missing dependencies are optional for public route QA. Missing preview Redis, Privy, PostHog, Inngest, AI Gateway, or public URL envs appear as dependency warnings with next actions. Production promotion remains strict for those dependencies.

Run beta URL checks with:

```bash
COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e
```

The command checks store routes, health, registry discovery, registry health, `harbor-yield`, search, `llms.txt`, 15 visible app records, and protected admin preview behavior.

## Docs

- [docs/PRODUCT.md](/C:/Users/HP/cotana/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/C:/Users/HP/cotana/docs/ARCHITECTURE.md)
- [docs/BUILD_PLAN.md](/C:/Users/HP/cotana/docs/BUILD_PLAN.md)
- [docs/HYBRID_AGENT_ARCHITECTURE.md](/C:/Users/HP/cotana/docs/HYBRID_AGENT_ARCHITECTURE.md)
- [docs/ROADMAP.md](/C:/Users/HP/cotana/docs/ROADMAP.md)
- [docs/DECISIONS.md](/C:/Users/HP/cotana/docs/DECISIONS.md)
- [docs/OPERATIONS.md](/C:/Users/HP/cotana/docs/OPERATIONS.md)
- [docs/BRAND_KIT.md](/C:/Users/HP/cotana/docs/BRAND_KIT.md)
- [docs/DEPLOYMENT.md](/C:/Users/HP/cotana/docs/DEPLOYMENT.md)
- [docs/BETA_QA.md](/C:/Users/HP/cotana/docs/BETA_QA.md)
- [docs/IMPORTS.md](/C:/Users/HP/cotana/docs/IMPORTS.md)
