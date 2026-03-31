# Cotana

Cotana is a consumer-facing app store for crypto applications. The product is intentionally designed to feel like a mainstream consumer marketplace rather than a web3 dashboard: no wallet UI, no wallet addresses, no chain tags on cards, and no blockchain-native copy in the public experience.

## Current status

The repo now includes a working Phase 1 vertical slice for:

- Privy auth in `apps/store` and `apps/admin`
- Privy DID to local `User` and `UserProfile` sync
- session-based admin authorization and admin route protection
- production-oriented Prisma schema and custom pgvector migration
- admin CRUD for creating, editing, drafting, publishing, and unpublishing apps
- public store pages backed by PostgreSQL data instead of demo fixtures
- likes, private library saves, and app-view tracking
- review eligibility enforcement, review creation, review flagging, and admin moderation queue
- embedding generation with app text normalization and OpenAI-compatible providers
- semantic retrieval with pgvector and raw SQL cosine similarity
- category-aware reranking backed by configurable weights in `ConfigKV`
- Inngest jobs for embeddings, signal refreshes, weekly snapshots, trending, and community-pick placeholder work
- Redis-backed caching, counters, and rate limiting with an in-memory fallback for development
- PostHog server-side analytics for auth, search, clicks, views, likes, saves, and reviews

This completes the first end-to-end vertical slice requested in the implementation brief.

## Product rules

- No visible wallet connection flow
- No wallet addresses or seed phrase UX
- No blockchain-native language in user-facing copy
- No chain tags on public app cards
- No developer self-submission flow in v1
- Public app cards show only logo, name, verified mark, one-line description, star rating, and category

## Stack

- Monorepo: pnpm workspaces + Turbo
- Apps: Next.js App Router, TypeScript, Tailwind CSS
- Shared packages: `db`, `ui`, `config`, `search`, `auth`, `analytics`, `types`
- Data: PostgreSQL, Prisma, pgvector, Redis
- Auth: Privy
- Jobs: Inngest
- Analytics: PostHog
- Deploy target: Vercel
- Data providers: DeFiLlama, Dune
- Embeddings: provider abstraction with OpenAI as the default implementation target

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

## Auth architecture

Cotana uses Privy for both applications:

- Store auth allows email, Google, Apple, and passkeys
- Admin auth uses the same sign-in methods
- The client exchanges the Privy identity token for a Cotana-owned HttpOnly session cookie
- Admin access is granted only when the email is allowlisted or the local database role is `ADMIN`
- Embedded wallets are disabled in the visible product surface

## Database and migrations

The Prisma schema lives at [packages/db/prisma/schema.prisma](/C:/Users/HP/cotana/packages/db/prisma/schema.prisma).

The first production migration lives at [packages/db/prisma/migrations/20260328173000_initial_vertical_slice/migration.sql](/C:/Users/HP/cotana/packages/db/prisma/migrations/20260328173000_initial_vertical_slice/migration.sql) and includes:

- `CREATE EXTENSION IF NOT EXISTS vector`
- the core Phase 1 schema
- check constraints for review rating and review body length
- an ivfflat cosine index for app embeddings

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
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

## Seed behavior

The seed script:

- inserts the fixed Phase 1 categories
- creates an admin user from `ADMIN_ALLOWLIST_EMAIL`
- creates a few published example apps for development
- seeds sample category signal rows for reranking development
- seeds default and category-specific ranking config rows in `ConfigKV`

## Current Phase 1 progress

- Done: monorepo scaffold, shared packages, auth/session sync, admin guard, Prisma schema, migration, seed, admin CRUD, public DB-backed listings, likes, library, review thresholds, review creation, review flagging, moderation queue, embeddings, semantic retrieval, category-aware reranking, Inngest jobs, Redis caching/rate limits, and PostHog event wiring
- Pending: empty-state/error polish and deployment setup

## Docs

- [docs/PRODUCT.md](/C:/Users/HP/cotana/docs/PRODUCT.md)
- [docs/ARCHITECTURE.md](/C:/Users/HP/cotana/docs/ARCHITECTURE.md)
- [docs/ROADMAP.md](/C:/Users/HP/cotana/docs/ROADMAP.md)
- [docs/DECISIONS.md](/C:/Users/HP/cotana/docs/DECISIONS.md)
- [docs/OPERATIONS.md](/C:/Users/HP/cotana/docs/OPERATIONS.md)
