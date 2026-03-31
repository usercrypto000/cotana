# Architecture

## Applications

- `apps/store`: public app store
- `apps/admin`: internal catalog and moderation dashboard

## Shared packages

- `packages/db`: Prisma client, schema, seed, and shared data services
- `packages/auth`: Privy token verification, user sync, session creation, and authorization helpers
- `packages/search`: embedding, retrieval, reranking, and provider integrations
- `packages/ui`: shared UI primitives
- `packages/config`: static navigation/config values
- `packages/types`: shared TypeScript types
- `packages/analytics`: PostHog event names and helpers

## Auth flow

1. User signs in with Privy in the client.
2. The app posts the Privy identity token to `/api/auth/sync`.
3. Cotana verifies the identity token server-side.
4. Cotana upserts the local user by `privyDid`.
5. Cotana issues an HttpOnly `cotana_session` cookie.
6. Next.js server components and route handlers use that session for authorization.

## Database status

Implemented:

- full Phase 1 core schema in Prisma
- custom migration for pgvector extension and vector index
- seed data for fixed categories, admin user, sample apps, and ranking config
- shared data services for admin CRUD, public listings, likes, library items, app views, reviews, flags, and moderation actions
- shared search and signal services for search events, click events, cached trending data, and signal job status

## Public store data flow

- home/category/library/profile/app detail pages now read from PostgreSQL
- likes and library saves are handled through route handlers
- app detail page writes app views when a signed-in user visits
- review eligibility is computed through a single shared service
- flagged reviews appear in the admin moderation queue immediately
- search result clicks are recorded when a result is opened from the search page

## Search pipeline

1. build app embedding text
2. create embeddings through `packages/search`
3. store vectors in `AppEmbedding`
4. retrieve candidates with pgvector cosine similarity
5. rerank candidates with configurable category-aware weights from `ConfigKV`
6. cache normalized query results in Redis
7. record search events and downstream result clicks for later ranking feedback

Implemented details:

- `embedText()` uses OpenAI embeddings when `OPENAI_API_KEY` is present and a deterministic local fallback when it is not
- `retrieveCandidates()` uses raw SQL against `AppEmbedding` with cosine similarity
- `rerankCandidates()` combines semantic similarity, ratings, review count, likes, recent view velocity, and category-specific signal values
- category-specific ranking weights live in `ConfigKV`, so search tuning does not require a redeploy

## Jobs and providers

- Inngest receives `app.created` and `app.updated` events to refresh embeddings
- Scheduled jobs refresh DeFi, lending-yield, and prediction-market signals
- Weekly snapshots persist historical numeric signal rows
- Trending recompute stores ranked app ids in both `ConfigKV` and Redis
- DeFiLlama is used for broad protocol and yield metrics
- Dune is used for category-specific analytics via query-result endpoints

## Caching and rate limits

- Redis is used for search-result caching, app detail caching, trending cache, review cooldown helpers, and page-view velocity counters
- Search, likes, saves, review creation, and review flagging are rate-limited
- When `REDIS_URL` is not set, Cotana falls back to an in-memory cache so local development still works

## Analytics

- PostHog server-side events are emitted for auth sign-up/login, search submission, result clicks, app detail views, likes, saves, review creation, and review flagging
