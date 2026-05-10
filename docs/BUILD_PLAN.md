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

## Phase 4 Next Builds

- Add a dedicated admin registry quality page if the discovery page becomes crowded.
- Add intent test result history so regressions can be compared over time.
- Add filters for evaluation logs by category, capability type, readiness bucket, and date.
- Add historical trust chart helpers using weekly signal snapshots and discovery insight snapshots.
- Add stronger seed coverage for more categories and intentionally weak metadata examples.
- Add admin controls for editing seeded intent test cases through `ConfigKV`.
- Add tests for app detail trust badge rendering.
- Add tests for evaluation-log persistence on the public registry search route.
- Add a compact admin view for capability quality score distributions.
- Add a registry health export endpoint for internal QA.

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
- Run `pnpm lint`.
- Run `pnpm build` when routes, schema, packages, or app pages change.

## Product Thesis

Cotana should not become the agent. Cotana should become the place agents check before choosing where to act. That keeps the product focused on discovery quality, trust surfaces, and deterministic ranking instead of turning it into an execution router.
