# Architecture

## Applications

- `apps/store`: public app store
- `apps/admin`: internal catalog, moderation, and discovery controls

## Shared packages

- `packages/db`: Prisma client, schema, seed, Redis helpers, and shared data services
- `packages/auth`: Privy token verification, user sync, session creation, and authorization helpers
- `packages/search`: embedding, retrieval, reranking, similar-app logic, and provider integrations
- `packages/ui`: shared UI primitives
- `packages/config`: navigation, runtime env parsing, and logging helpers
- `packages/types`: shared TypeScript types
- `packages/analytics`: PostHog event names and helpers

## Auth flow

1. User signs in with Privy in the client.
2. The app posts the Privy identity token to `/api/auth/sync`.
3. Cotana verifies the identity token server-side.
4. Cotana upserts the local user by `privyDid`.
5. Cotana issues an HttpOnly `cotana_session` cookie.
6. Next.js server components and route handlers use that session for authorization.

Store and admin auth are intentionally simple. The current configured login methods are email and browser passkeys. Admin access is a separate authorization check, not a separate login product.

## Schema highlights

Phase 1 core models remain in place:

- `User`, `UserProfile`
- `Category`
- `App`, `AppTag`, `AppScreenshot`, `AppEmbedding`
- `AppSignal`, `AppSignalSnapshot`
- `Review`, `ReviewFlag`, `ReviewModerationStrike`
- `AppLike`, `AppLibraryItem`
- `SearchEvent`, `SearchClick`, `AppView`
- `ConfigKV`

`UserRole` contains only `USER` and `ADMIN`. Cotana no longer reserves a developer-portal role because app submission, approval, and maintenance are admin-only.

Phase 2 adds:

- `EditorialShelf`
- `EditorialShelfItem`
- `AppUpdate`
- `DiscoveryInsightSnapshot`
- `AgentCapability`
- `AgentRegistryEvaluationLog`

`App` also now carries:

- `verified`
- `verifiedNote`
- `agentAudience`
- `agentListingStatus`
- `agentSummary`
- `agentDocsUrl`
- `agentIntegrationNotes`
- `communityPick`
- `communityPickMonth`
- `communityPickReason`
- `communityPickUpdatedAt`

## Public store data flow

- home page loads published apps, homepage shelves, global trending, and global rising
- category pages load category listings, scoped shelves, scoped trending, and scoped rising
- search page uses the search endpoint and supports category filter plus sort controls
- app detail page loads app content, screenshots, updates, reviews, and similar apps
- agent-ready detail pages load active capabilities only after the agent listing is published
- likes and library saves are handled through route handlers
- app detail visits write `AppView`
- review eligibility is computed through a single shared service
- flagged reviews appear in the admin moderation queue immediately

## Search pipeline

1. Build app embedding text from name, descriptions, category, and tags.
2. Create embeddings through `packages/search`.
3. Store vectors in `AppEmbedding`.
4. Retrieve candidates with pgvector cosine similarity via raw SQL.
5. Rerank candidates with configurable category-aware weights from `ConfigKV`.
6. Apply search-specific sort behavior.
7. Cache normalized query results in Redis.
8. Record search events and downstream clicks for later ranking feedback.

Implemented details:

- `embedText()` uses OpenAI embeddings when `OPENAI_API_KEY` is present and a deterministic local fallback when it is not
- `retrieveCandidates()` uses raw SQL against `AppEmbedding` with cosine similarity
- `rerankCandidates()` combines semantic similarity, ratings, review count, likes, page-view velocity, and category-specific signal values
- `getSimilarApps()` uses embedding similarity first, excludes the current app, applies optional same-category boosting, reranks by quality signals, and caches results
- app embedding text includes audience, agent summary, docs, and active capability descriptions only for published agent listings

## Agent Registry

Cotana exposes an agent-facing registry beside the human store.

Endpoints:

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

The registry returns only published apps where `agentAudience` is `AGENT` or `HYBRID`, `agentListingStatus` is `PUBLISHED`, and at least one active capability exists. Each manifest includes app identity, category, trust badges, agent summary, docs URL, and active capabilities with auth, schema, safety, reliability, and latency metadata.

The manifest marks Cotana as `DISCOVERY_ONLY`. Downstream execution, credential handling, and app-specific permissions remain outside Cotana.

Registry search lives in `packages/search`. It embeds the agent intent and each active capability text, computes semantic similarity, then applies explicit quality weights for reliability, schema completeness, safety notes, auth simplicity, docs coverage, and latency. Results are grouped by app, but ranked by the best matched capability.

Compatibility filters can narrow results before scoring:

- `auth`: `NONE`, `API_KEY`, `OAUTH2`, `MCP`, `CUSTOM`
- `interface`: `HTTP_API`, `MCP_SERVER`, `SDK`, `WEBHOOK`, `DATA_FEED`, `DOCS_ONLY`
- `interaction`: `READ_ONLY`, `WRITE_ACTION`, `TRANSACTIONAL`, `HUMAN_HANDOFF`

Each search result returns:

- `app`
- `matchedCapabilities`
- `score`
- `matchReason`
- `metadata` on the response with result count, supported filters, and the no-execution boundary

Agent registry search is rate-limited by request identity and emits `agent_registry_searched`. Manifest reads emit `agent_registry_manifest_viewed`. Discovery-document and schema reads emit their own registry analytics events.

The capability taxonomy endpoint groups published active capabilities by `capabilityType`, app count, category coverage, auth type, interface type, and interaction mode. The compatibility endpoint returns total registry coverage versus coverage after the requesting agent's filters are applied.

Capability manifests expose one selected capability with quality signals for schema completeness, safety notes, docs coverage, endpoint availability, auth friction, latency tier, and reliability tier. The registry policy endpoint and `llms.txt` give machine clients a stable description of Cotana's discovery-only boundary.

Phase 4 adds a capability quality score to the same signal set. The score is deterministic and ranges from `0` to `100`, with penalties for weak metadata and unsafe interaction modes. Registry search also returns an evaluation object and persists `AgentRegistryEvaluationLog` rows with query, filters, candidate counts, matched capability, similarity, score, quality score, exclusions, and blocking issue count.

Admin app CRUD owns the first operational surface for agent metadata. Capability editing is currently JSON-based to keep the back office compact while the data model settles. The admin discovery page also exposes registry quality rows and an agent search preview panel for testing intents safely.

The admin discovery page now groups registry readiness into operational buckets: ready, needs metadata, unsafe interaction mode, missing schema, missing safety notes, weak docs, and low reliability. Seeded intent tests live in `ConfigKV` under `agent.intent_tests` and run against registry search for fast calibration.

## Discovery services

Cotana now has a dedicated discovery service in [packages/db/src/services/discovery.ts](/C:/Users/HP/cotana/packages/db/src/services/discovery.ts).

Trending default weights:

- `viewVelocity`: `0.32`
- `searchCtr`: `0.18`
- `likeVelocity`: `0.20`
- `reviewVelocity`: `0.12`
- `signalMomentum`: `0.18`

Rising default weights:

- `viewGrowth`: `0.28`
- `clickGrowth`: `0.24`
- `likeGrowth`: `0.18`
- `reviewGrowth`: `0.16`
- `signalMomentum`: `0.08`
- `lowHistoryBoost`: `0.06`

Community-pick default weights and thresholds:

- `ratingQuality`: `0.34`
- `reviewCountQuality`: `0.18`
- `likeVelocity`: `0.18`
- `engagementQuality`: `0.15`
- `moderationSafety`: `0.15`
- `minRating`: `4`
- `minReviewCount`: `2`
- `maxModerationRisk`: `0.35`
- `scoreThreshold`: `0.58`

Discovery rows are persisted into `DiscoveryInsightSnapshot` with:

- `kind`
- optional `categorySlug`
- `score`
- `rank`
- `inputsJson`
- `windowStart`
- `windowEnd`
- `computedAt`

That snapshot table is the basis for:

- public trending and rising sections
- admin discovery inspection
- internal ranking debugging

## Editorial shelf service

Shelf logic lives in [packages/db/src/services/editorial.ts](/C:/Users/HP/cotana/packages/db/src/services/editorial.ts).

It supports:

- admin shelf CRUD
- ordered shelf item replacement
- homepage and category shelf reads
- cache invalidation for homepage and per-category shelf surfaces

## Changelog service

Changelog logic lives in [packages/db/src/services/updates.ts](/C:/Users/HP/cotana/packages/db/src/services/updates.ts).

It supports:

- list updates by app
- create update
- edit update
- delete update

Updates are rendered newest-first on the public app detail page.

## Jobs and providers

Inngest now runs:

- `app.created`: generate embedding
- `app.updated`: refresh embedding
- `signals.refresh.lending_yield`: every 4 hours
- `signals.refresh.defi`: every 6 hours
- `signals.refresh.prediction_markets`: every 6 hours
- `snapshots.weekly`: Sunday 00:00 UTC
- `trending.recompute`: every hour
- `rising.recompute`: every hour at minute 15
- `community_pick.recompute`: first day of month 00:00 UTC

Provider usage:

- DeFiLlama handles broad protocol and yield metrics
- Covalent/GoldRush is configured for future address-oriented app signals such as DeFi positions, activity, transactions, and token metadata
- prediction-market metrics degrade to platform-native activity until Cotana stores provider identifiers that can support reliable external signal lookup
- provider failures degrade safely because discovery falls back to platform-native activity signals

## Caching and rate limits

- Redis is used for search-result caching, app detail caching, editorial shelf reads, discovery result caching, similar-app caching, review cooldown helpers, and page-view velocity counters
- Search, likes, saves, review creation, and review flagging are rate-limited
- When `REDIS_URL` is not set, Cotana falls back to an in-memory cache so local development still works

## Analytics

PostHog server-side events now include:

- `search_submitted`
- `search_result_clicked`
- `search_filter_changed`
- `search_sort_changed`
- `app_detail_viewed`
- `app_liked`
- `app_saved`
- `review_created`
- `review_flagged`
- `shelf_impression`
- `shelf_app_clicked`
- `trending_app_clicked`
- `rising_app_clicked`
- `similar_app_clicked`
- `changelog_viewed`
- `changelog_item_clicked`
- `verified_badge_seen`
- `community_pick_badge_seen`
- `agent_registry_searched`
- `agent_registry_manifest_viewed`
- `agent_registry_discovery_viewed`
- `agent_registry_schema_viewed`
- `agent_registry_capabilities_viewed`
- `agent_registry_compatibility_viewed`
- `agent_registry_capability_viewed`
- `agent_registry_policy_viewed`
- `auth_signed_up`
- `auth_logged_in`

## Test coverage

Vitest currently covers:

- editorial shelf output shaping
- trending, rising, and community-pick formulas
- changelog/update helper behavior
- signal snapshot query helpers
- search sorting
- similar-app boosting and quality ordering
- trust badge visibility
