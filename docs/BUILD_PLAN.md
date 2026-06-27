# Cotana Build Plan

Cotana is a discovery channel for humans and AI agents. Humans discover apps through the public store. Agents discover apps and capabilities through machine-readable registry surfaces. Cotana does not execute actions, handle credentials, initiate wallet actions, or route user instructions downstream.

## Product Boundary

- Cotana discovers apps and capabilities.
- Cotana does not become the agent.
- Cotana does not execute downstream actions.
- Cotana does not handle app-specific credentials.
- Cotana does not initiate wallet actions, transactions, signatures, or delegated trading.
- Cotana is the place agents check before choosing where to act.

## Product Rules

- No wallet UI in the public product.
- No visible wallet addresses.
- No seed phrase UX.
- No chain tags on public app cards.
- No developer portal.
- No developer self-submission.
- Admins approve, add, edit, publish, and archive apps.
- Public app cards show only logo, name, verified mark, short description, rating, and category.
- User profiles stay minimal: saved apps, likes, reviews, and eligibility state.

## Current Architecture

- Monorepo with pnpm workspaces and Turbo.
- Public store lives in `apps/store`.
- Admin portal lives in `apps/admin`.
- Shared packages live in `packages/db`, `packages/ui`, `packages/config`, `packages/search`, `packages/auth`, `packages/analytics`, and `packages/types`.
- Data stack is PostgreSQL, Prisma, pgvector, and Redis.
- Auth is Privy with simple email and browser passkey flows.
- Jobs run through Inngest.
- Analytics run through PostHog.
- Deployment target is Vercel.
- Search uses embeddings, semantic retrieval, and deterministic reranking.
- Agent registry search ranks capabilities, not generic app pages.

## Phase 1 Ledger

- Done: scaffold monorepo and both Next.js apps.
- Done: shared workspace packages.
- Done: Privy auth integration and user sync.
- Done: admin guard and allowlisted admin access.
- Done: Prisma schema, migrations, pgvector setup, and seed script.
- Done: admin CRUD for apps and moderation queue.
- Done: public store pages backed by database data.
- Done: likes, library saves, app-view tracking, review eligibility, review creation, and review flagging.
- Done: embedding generation, semantic retrieval, and category-aware reranking.
- Done: Inngest jobs, Redis caching, rate limits, and PostHog events.

## Phase 2 Ledger

- Done: editorial shelves with admin CRUD and public rendering.
- Done: global and category-scoped trending sections.
- Done: global and category-scoped rising sections.
- Done: search filters and sort controls.
- Done: embedding-driven similar apps on detail pages.
- Done: changelog and updates feed.
- Done: verified badge controls and public rendering.
- Done: computed monthly community-pick badge.
- Done: weekly historical signal snapshots and discovery debug snapshots.
- Done: lightweight admin discovery controls for inspection and config tuning.
- Done: analytics expansion for shelves, discovery, badges, and changelog.
- Done: automated tests for discovery logic.

## Phase 3 Ledger

- Done: app audience model for `HUMAN`, `AGENT`, and `HYBRID`.
- Done: structured agent capability schema.
- Done: admin editing for audience and capabilities.
- Done: public agent-ready detail sections.
- Done: machine-readable agent registry endpoints.
- Done: agent-aware embedding text.
- Done: discovery-only listing status and manifest trust boundary.
- Done: capability-focused registry search endpoint.
- Done: semantic agent capability search with match explanations.
- Done: auth, interface, and interaction compatibility filters for outside agents.
- Done: public registry discovery document and schema endpoint.
- Done: agent registry search rate limits and analytics.
- Done: admin registry quality checks.
- Done: registry categories and stats endpoints.
- Done: admin agent search preview.
- Done: capability taxonomy and compatibility coverage endpoints.
- Done: per-capability manifests with quality signals.
- Done: registry policy endpoint and `llms.txt`.
- Done: admin registry readiness summary.

## Phase 4 Ledger

- Done: capability quality score and grade.
- Done: seeded agent intent test cases in `ConfigKV`.
- Done: admin readiness buckets for missing metadata, schemas, safety notes, docs, reliability, and unsafe modes.
- Done: subtle app-detail trust badges for machine-readable capabilities.
- Done: persisted registry evaluation logs for agent searches.
- Done: migration for `AgentRegistryEvaluationLog`.
- Done: documentation updates for registry quality and trust surfaces.
- Done: validation across typecheck, tests, lint, and build.

## Phase 4.5 Ledger

- Done: dedicated admin registry quality page.
- Done: evaluation-log filters and single-log detail inspection.
- Done: persisted intent test run history and latest-vs-previous regression comparison.
- Done: deterministic trust trend helpers from evaluation logs, signal snapshots, discovery insight snapshots, and current metadata buckets.
- Done: capability quality distribution by grade, readiness bucket, type, auth, interface, interaction mode, and listing status.
- Done: optional weak metadata fixtures gated by `COTANA_SEED_WEAK_AGENT_FIXTURES=true`.
- Done: admin-only registry health export endpoint.

## Phase 4.6 Ledger

- Done: shared registry contract metadata in `@cotana/config`.
- Done: version metadata across public registry discovery surfaces and `llms.txt`.
- Done: app and capability manifest versions, review timestamps, and deprecation metadata.
- Done: admin-only registry-sensitive change history.
- Done: public machine-client docs at `/agent-registry/docs`.
- Done: expanded schema contract endpoint.
- Done: deterministic compatibility confidence scoring.
- Done: focused public registry contract tests.

## Phase 4.7 Ledger

- Done: admin-only catalog coverage audit with human category, agent category, and capability-type coverage.
- Done: thin-area warnings for sparse human categories, sparse agent-ready capability types, low docs coverage, low schema coverage, and weak reliability coverage.
- Done: launch catalog seed fixtures gated by `COTANA_SEED_LAUNCH_CATALOG=true`.
- Done: red-team registry query definitions in `ConfigKV` and persisted run history beside seeded intent tests.
- Done: public registry readiness metadata on discovery documents.
- Done: manifest quality warnings that stay public-safe and exclude admin notes.
- Done: internal catalog coverage route and compact admin page.

## Phase 4.8 Ledger

- Done: startup/runtime environment validation for required envs, optional envs, invalid URLs, invalid booleans/numbers, and local fallbacks.
- Done: deployment health endpoints for store, admin, registry, and admin-only jobs health.
- Done: staging seed workflow with explicit confirmation and production fixture guards.
- Done: `pnpm test:smoke` launch-critical smoke route checks.
- Done: admin launch checklist page and API.
- Done: empty-state helper coverage for category/search/similar/changelog/reviews/registry/provider/Redis states.
- Done: registry external-client curl examples and analytics QA event reference.
- Done: Phase 4.8 follow-up public-store visibility fix. Seed now creates public reviews, likes, views, search clicks, screenshots, updates, shelves, registry fixtures, and recomputed trending, rising, and community-pick snapshots.
- Done: public homepage polish for consumer-native hero copy, compact intent search, spotlight shelf, trending, rising, and category rows.
- Done: minimal app card contract enforced through the shared card component and smoke coverage.
- Done: launch checklist public seed visibility gate for published apps, spotlight items, trending rows, rising rows, category coverage, screenshots, reviews, updates, registry listings, and active capabilities.

## Phase 4.9 Ledger

- Done: Vercel deployment target constants for `usercrypto000/cotana`, `cotana`, `cotana-admin`, and `cotana.xyz`.
- Done: production deployment runbook in `docs/DEPLOYMENT.md`.
- Done: production migration preflight helper and runbook.
- Done: CI workflow expanded to install, Prisma generate, typecheck, test, smoke, lint, build, and beta E2E command.
- Done: URL-driven beta E2E script for production preview.
- Done: structured logging for registry search, health endpoints, jobs, seed guards, and env validation warnings.
- Done: beta QA checklist in `docs/BETA_QA.md`.
- Done: internal catalog import validation, dry-run, guarded write script, and docs.
- Done: launch checklist production readiness acknowledgements.
- Done: beta preview health semantics with `ok_with_warnings`, dependency-level warnings, protected admin preview handling, and seed fixture review validation.

## Phase 4 Next Builds

- Use accumulated trust trend data for richer admin charts once enough history exists.
- Add admin controls for editing seeded intent test cases through `ConfigKV`.
- Introduce breaking registry contract changes only with a new `schemaVersion` or `registryVersion`.
- Use catalog coverage audit output to prioritize launch QA without adding public submission, paid ranking, feeds, or execution.
- Keep first-release public surfaces blocked on seeded spotlight, trending, rising, and category app-card visibility.

## Out Of Scope

- Follow graph.
- Activity feeds.
- Notifications.
- Paid placement.
- Promoted search slots.
- Developer portal.
- Developer claim flow.
- Developer self-submission.
- Agent execution.
- Credential handling.
- Wallet actions.

## Build Order From Here

1. Harden Phase 4 registry quality surfaces.
2. Improve admin inspection for registry search evaluation logs.
3. Add persistence for intent test run history.
4. Add trust trend query helpers from existing snapshot data.
5. Expand launch seed data and weak-metadata fixtures.
6. Add route and UI tests for the new trust surfaces.
7. Polish copy and empty states without adding new product surfaces.

## Validation Rule

After each meaningful build:

- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm test:smoke`.
- Run `pnpm test:e2e` against preview or production URLs before beta handoff.
- For the current beta preview, run `COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e`.
- Run `pnpm lint`.
- Run `pnpm build` when routes, schema, packages, or app pages change.

## Product Thesis

Cotana should not become the agent. Cotana should become the place agents check before choosing where to act. That keeps the product focused on discovery quality, trust surfaces, and deterministic ranking instead of turning it into an execution router.
