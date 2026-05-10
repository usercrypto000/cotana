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
- app tags, sample signal rows, app updates, and verified-note metadata
- editorial shelves including `featured`, `best-for-beginners`, `prediction-markets-to-watch`, and `new-this-week`
- default ranking and discovery config rows in `ConfigKV`

Run it with:

- `pnpm db:seed`

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
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Automated coverage

Vitest currently covers:

- editorial shelf shaping logic
- trending, rising, and community-pick formulas
- changelog/update CRUD helpers
- signal snapshot helper behavior
- search sorting and similar-app reranking helpers
- trust badge rendering

The test entrypoint is:

- `pnpm test`

## Build status

Current validation is green:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

The current build still emits a non-fatal Privy warning about the optional `@farcaster/mini-app-solana` dependency during Next builds in both apps.

## Docs

- [docs/PRODUCT.md](/C:/Users/HP/cotana/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/C:/Users/HP/cotana/docs/ARCHITECTURE.md)
- [docs/BUILD_PLAN.md](/C:/Users/HP/cotana/docs/BUILD_PLAN.md)
- [docs/HYBRID_AGENT_ARCHITECTURE.md](/C:/Users/HP/cotana/docs/HYBRID_AGENT_ARCHITECTURE.md)
- [docs/ROADMAP.md](/C:/Users/HP/cotana/docs/ROADMAP.md)
- [docs/DECISIONS.md](/C:/Users/HP/cotana/docs/DECISIONS.md)
- [docs/OPERATIONS.md](/C:/Users/HP/cotana/docs/OPERATIONS.md)
