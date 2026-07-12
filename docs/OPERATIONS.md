# Operations

This document tracks deployment notes, provider setup, moderation operations, scheduled jobs, and discovery calibration controls.

## Setup checklist

- Set `ADMIN_ALLOWLIST_EMAIL` before running the seed script so the local admin account is created correctly
- Run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` before starting the apps
- Ensure the PostgreSQL instance supports pgvector because the initial migration enables the `vector` extension
- Set `NEXT_PUBLIC_STORE_URL` and `NEXT_PUBLIC_ADMIN_URL` correctly in deployed environments
- Configure Privy, PostHog, OpenAI, Redis, Inngest, and Covalent keys before production deploys

## Runtime notes

- Redis is optional for local development, but recommended for realistic cache and rate-limit behavior
- Search, discovery reads, similar apps, and editorial shelf reads are cached
- Review creation and flagging enforce cooldowns and rate limits
- Discovery caches are invalidated when discovery weights are updated or recompute jobs run
- Community-pick state is persisted on the `App` row and refreshed monthly
- Agent registry endpoints are read-only and only expose published apps marked `AGENT` or `HYBRID` with `agentListingStatus = PUBLISHED`

## Scheduled jobs

- `signals.refresh.lending_yield`: every 4 hours
- `signals.refresh.defi`: every 6 hours
- `signals.refresh.prediction_markets`: every 6 hours
- `snapshots.weekly`: Sunday 00:00 UTC
- `trending.recompute`: every hour
- `rising.recompute`: every hour at minute 15
- `community_pick.recompute`: first day of month 00:00 UTC

## Provider configuration

- `AI_GATEWAY_API_KEY` enables local or non-Vercel embedding calls through Vercel AI Gateway; Vercel deployments can use automatic `VERCEL_OIDC_TOKEN` when AI Gateway is enabled for the project
- `AI_GATEWAY_EMBEDDING_MODEL` defaults to `openai/text-embedding-3-small`
- `OPENAI_API_KEY` is a legacy embedding fallback only
- `DEFILLAMA_API_KEY` is optional and only needed if the provider configuration requires authenticated access
- `COVALENT_API_KEY` enables the Covalent/GoldRush provider path once app-level identifiers are available
- `COVALENT_BASE_URL` defaults to `https://api.covalenthq.com/v1`
- `COVALENT_TIMEOUT_MS` defaults to `10000`
- `POSTHOG_KEY` and `POSTHOG_HOST` enable analytics capture

## Discovery configuration

Discovery weights are stored in `ConfigKV` and can be updated without redeploying:

- `discovery.weights.trending`
- `discovery.weights.rising`
- `discovery.weights.community_pick`

Search weights are also stored in `ConfigKV`:

- `ranking.weights.default`
- `ranking.weights.defi`
- `ranking.weights.lending-yield`
- `ranking.weights.prediction-markets`

The admin discovery page exposes:

- trending debug rows
- rising debug rows
- community-pick debug rows
- config JSON editors
- signal snapshot health summaries

## Moderation

- Flagged reviews remain visible until action is taken
- Admins can dismiss or remove flagged reviews from the admin queue
- Community-pick qualification uses moderation-risk thresholds, so heavy moderation activity can keep an app out of that badge state

## Historical data

Two historical data systems now exist:

- `AppSignalSnapshot` for weekly metric snapshots such as TVL, APY/APR, volume, liquidity depth, and open interest
- `DiscoveryInsightSnapshot` for trending, rising, and community-pick debug history

This gives Cotana a usable data trail for future charts, comparisons, and trust surfaces.

## Agent registry checks

Use these URLs after seeding hybrid apps:

- `GET /.well-known/cotana-agent-registry`
- `GET /api/agent-registry`
- `GET /api/agent-registry/harbor-yield`
- `GET /api/agent-registry/harbor-yield/capabilities/compare-yield-options`
- `GET /api/agent-registry/search?q=yield`
- `GET /api/agent-registry/search?q=yield&auth=NONE,API_KEY&interface=HTTP_API&interaction=READ_ONLY`
- `GET /api/agent-registry/schema`
- `GET /api/agent-registry/categories`
- `GET /api/agent-registry/capabilities`
- `GET /api/agent-registry/compatibility?auth=NONE,API_KEY&interface=HTTP_API&interaction=READ_ONLY`
- `GET /api/agent-registry/policy`
- `GET /api/agent-registry/stats`
- `GET /llms.txt`

Agent manifests should include only active capabilities from published registry listings. Admins can edit audience, registry status, docs URLs, internal integration notes, and capability metadata from the app create/edit form.

Registry publication should fail when an app lacks a clear agent summary, an active capability, schemas, safety notes, or a docs or endpoint URL. Cotana remains discovery-only and does not test downstream execution in this phase.

Agent registry search should return matched capabilities with `matchReason`, `similarity`, and `score`. Empty or irrelevant queries should degrade to an empty result set rather than a generic app directory.

Published registry listings should prefer `READ_ONLY` interaction mode. The admin validator currently blocks non-read-only capabilities from being published to keep Cotana's agent side discovery-only and low-risk.

The admin discovery page includes agent registry quality rows with readiness scores and blocking issue counts. A listing marked "Needs work" should not be treated as ready for outside agents until the listed issues are resolved.

Capability manifests should repeat Cotana's no-execution usage boundary and include quality signals for schema completeness, safety notes, docs availability, endpoint availability, auth friction, latency tier, and reliability tier.

Capability quality scores are deterministic and should be used as an inspection signal, not as an execution permission. A high score means the registry metadata is usable for discovery. It does not mean Cotana has tested or approved downstream execution.

## Phase 4.5 registry QA

Use `/registry-quality` in admin for compact registry QA:

- filter evaluation logs by date range, query, category, capability type, auth type, interface type, interaction mode, readiness bucket, matched app, and blocking issue count
- open an evaluation detail page to inspect filters, candidates, exclusions, top capability, similarity, score, quality score, and match reason
- run seeded ConfigKV intent tests from the admin page and compare the latest run against the previous run
- review capability distribution by grade, readiness bucket, capability/auth/interface/interaction coverage, and listing status
- inspect blocked non-read-only capabilities before publication

Admin-only JSON endpoints:

- `/api/admin/catalog-coverage`
- `/api/admin/environment-health`
- `/api/admin/jobs/health`
- `/api/admin/launch-checklist`
- `/api/admin/agent-registry/evaluation-logs`
- `/api/admin/agent-registry/evaluation-logs/{id}`
- `/api/admin/agent-registry/intent-tests/run`
- `/api/admin/agent-registry/trust-trends`
- `/api/admin/agent-registry/health-export`

Weak registry fixtures are opt-in with `COTANA_SEED_WEAK_AGENT_FIXTURES=true`. They are local/dev/test examples only and should not be enabled for production seed runs unless explicitly intended for QA.

Launch catalog fixtures are opt-in with `COTANA_SEED_LAUNCH_CATALOG=true`. Use them for local and staging launch QA across DeFi, Lending & Yield, Trading, Prediction Markets, Payments, Wallets, Staking, RWA, Identity, and Launchpads. Do not enable them for production seed runs unless the environment is explicitly meant to receive fixture data.

Operational boundary: these tools inspect discovery metadata. They do not execute capabilities, handle credentials, initiate wallet actions, route instructions downstream, or create developer self-submission workflows.

## Phase 4.6 registry contract operations

Public registry clients should inspect `schemaVersion`, `registryVersion`, `generatedAt`, `discoveryOnly`, and `supportedEndpoints` on registry responses before depending on a response shape. Current contract version is `2026-05-17`.

Use `/agent-registry/docs` as the public machine-client guide. It is documentation for agents and workflow builders, not a developer portal. It must not introduce account creation, app submission, claim flows, credential handling, or execution routing.

Manifest review process:

- incremented app and capability manifest versions indicate registry-sensitive metadata changed
- `lastReviewedAt` should be refreshed when capability compatibility, schema, safety, docs, reliability, latency, or deprecation metadata changes
- `AgentRegistryChangeLog` is admin-only and should be reviewed when diagnosing registry drift or stale machine-readable surfaces
- internal notes must not appear in public manifest, search, schema, policy, docs, or `llms.txt` responses

Deprecation process:

- prefer `DEPRECATED` over deleting historical capability metadata
- include `deprecatedAt`, `deprecationReason`, and a replacement capability or replacement docs URL when available
- deprecated capabilities must not rank in default registry search
- paused registry listings must remain hidden from public registry list and search
- direct capability manifests may explain deprecation for addressable capabilities

Compatibility confidence:

- high confidence means compatible coverage is broad and metadata is strong
- medium confidence should trigger admin inspection before treating coverage as stable
- low confidence means outside agents should widen filters or fall back to another discovery path
- the score is deterministic and is never an execution permission

Seeded agent intent tests live in `ConfigKV` at `agent.intent_tests`. Admins should use them to catch obvious search regressions such as yield intents ranking prediction-market capabilities.

Registry evaluation logs are written for agent searches. Inspect them when debugging result quality: query, filters, candidate count, matched capability, similarity, score, quality score, excluded candidates, and blocking issue count should explain why the search behaved the way it did.

## Phase 4.7 launch QA operations

Use `/catalog-coverage` in admin to inspect launch depth by human category and registry coverage by category/capability type. Thin-area warnings flag sparse human categories, sparse agent-ready capability types, low docs coverage, low schema coverage, and weak reliability coverage.

Use the red-team test action on the registry quality page before launch-style QA passes. Red-team runs persist beside normal intent tests, so newly failing risky-intent checks can be compared over time.

Public readiness metadata is safe for outside agents. Detailed registry health, blocked publication reasons, and catalog coverage warnings remain internal.

## Phase 4.8 staging launch workflow

Required environment groups:

- Database: `DATABASE_URL`, and `DIRECT_URL` in production.
- URLs: `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_ADMIN_URL`, and optional `NEXT_PUBLIC_REGISTRY_URL`.
- Auth: `ADMIN_ALLOWLIST_EMAIL`, production `COTANA_SESSION_SECRET`, `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_ID`, and `PRIVY_APP_SECRET`. `NEXT_PUBLIC_PRIVY_CLIENT_ID` is optional unless a Privy app client is configured. `PRIVY_VERIFICATION_KEY` is optional because the Privy server SDK can resolve signing keys from the app configuration.
- Redis: `REDIS_URL` in production; local/dev may use the in-memory fallback.
- Analytics and jobs: `POSTHOG_KEY` when analytics are enabled, plus Inngest keys in production.
- Search/providers: Vercel AI Gateway through `AI_GATEWAY_API_KEY` or automatic Vercel OIDC in production; provider keys are required when signal providers are explicitly enabled.

Health endpoints:

- Store: `/api/health`
- Registry: `/api/agent-registry/health`
- Admin: `/api/health`
- Jobs: `/api/admin/jobs/health` admin-only

Health statuses:

- `ok`: dependencies are configured and reachable
- `ok_with_warnings`: preview-safe warnings exist, but public QA can continue
- `degraded`: a required non-database dependency is missing or unavailable
- `unhealthy`: the database is unreachable or the route cannot return a safe health payload

Preview health warnings should list dependency-level `status`, `message`, and `nextAction` entries. Redis, Privy, PostHog, Inngest, AI Gateway, and public URL envs can be warning-only in Vercel preview when the QA pass is limited to public discovery routes. Production promotion requires those dependencies to be configured.

Seed commands:

- Local baseline: `pnpm seed:local`
- Staging launch fixtures: `COTANA_STAGING_SEED_CONFIRM=true pnpm seed:staging`
- Reset local database: `pnpm seed:reset-local`

The staging seed command refuses production and requires `COTANA_STAGING_SEED_CONFIRM=true`. Fixture flags are blocked when `NODE_ENV=production`.

Seed visibility verification:

- Open the public homepage and confirm spotlight, trending, rising, and category rows show app cards.
- Open a category page and confirm published apps plus category-scoped trending and rising rows show app cards.
- Open a seeded app detail page, such as `/apps/harbor-yield`, and confirm screenshots, reviews, updates, similar apps, and trust states are visible.
- Open admin `/launch-checklist` and confirm public seed visibility shows nonzero published apps, spotlight items, trending, rising, categories, screenshots, reviews, updates, registry listings, and capabilities.

The launch checklist fails the public homepage seed visibility item when spotlight items, trending rows, rising rows, or category coverage would render empty after seed.

Smoke tests:

- `pnpm test:smoke`

Run the launch checklist in admin at `/launch-checklist` before staging handoff. It summarizes environment validation, public seed visibility, catalog coverage, registry readiness, red-team runs, seeded intent failures, thin categories, missing screenshots, missing updates, weak docs, deprecated capability visibility, and paused listing review.

## Phase 4.9 production preview workflow

Deployment targets:

- GitHub repository: `usercrypto000/cotana`
- Store Vercel project: `cotana`
- Store production URL: `https://cotana.xyz`
- Store beta preview URL: `https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app`
- Admin Vercel project: `cotana-admin`
- Admin production URL: `https://cotana-admin.vercel.app`
- Admin beta preview URL: `https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app`

Prepare Vercel bundles before deployment:

- `pnpm deploy:prepare`

Production migration flow:

- run `pnpm db:generate`
- inspect pending migrations
- confirm `DATABASE_URL` and `DIRECT_URL`
- confirm fixture seed flags are disabled
- run `pnpm db:migrate:deploy`
- set `COTANA_MIGRATION_STATUS_CHECKED=true` after verification

Production fixture seeds are not allowed. Do not run `pnpm seed:staging` or local reset scripts against production.

Beta E2E command:

- `COTANA_E2E_STORE_URL=https://cotana.xyz COTANA_E2E_ADMIN_URL=https://cotana-admin.vercel.app pnpm test:e2e`
- `COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e`

The beta E2E output prints route, HTTP status, `pass` or `warn` or `fail`, reason, and next action. Admin preview protection or an admin shell with an auth configuration warning confirms the admin deploy exists and should not be counted as a failed deploy. Manual admin health requires configured Privy preview credentials and an authenticated admin session.

Catalog import command:

- dry run: `pnpm catalog:import ./catalog.json`
- write: `pnpm catalog:import ./catalog.json --write`
- production write: `COTANA_CONFIRM_PRODUCTION_IMPORT=true pnpm catalog:import ./catalog.json --write`

Use `docs/DEPLOYMENT.md`, `docs/BETA_QA.md`, and `docs/IMPORTS.md` for the full runbooks.

## Testing and release checks

Run this validation set before shipping:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:smoke`
- `pnpm build`

Current known build note:

- Next builds emit a non-fatal Privy warning about the optional `@farcaster/mini-app-solana` module in both apps
