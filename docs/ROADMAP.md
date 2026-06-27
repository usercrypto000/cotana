# Roadmap

## Phase 1

- Done: scaffold monorepo and both Next.js apps
- Done: shared workspace packages
- Done: Privy auth integration and user sync
- Done: admin guard and allowlisted admin access
- Done: Prisma schema, migrations, pgvector extension setup, and seed script
- Done: admin CRUD for apps and moderation queue
- Done: public store pages backed by database data
- Done: likes, library saves, app-view tracking, review eligibility, review creation, and review flagging
- Done: embedding generation, semantic retrieval, and category-aware reranking
- Done: Inngest jobs, Redis caching/rate limits, and PostHog events

## Phase 2

- Done: editorial shelves with admin CRUD and public rendering
- Done: global and category-scoped trending sections
- Done: global and category-scoped rising sections
- Done: search filters and sort controls
- Done: embedding-driven similar apps on detail pages
- Done: changelog and updates feed
- Done: verified badge controls and public rendering
- Done: computed monthly community-pick badge
- Done: weekly historical signal snapshots and discovery debug snapshots
- Done: lightweight admin discovery controls for inspection and config tuning
- Done: analytics expansion for shelves, discovery, badges, and changelog
- Done: automated tests for the new discovery logic

## Phase 3

Started as a hybrid app-store direction:

- Done: app audience model for `HUMAN`, `AGENT`, and `HYBRID`
- Done: structured agent capability schema
- Done: admin editing for audience and capabilities
- Done: public agent-ready detail sections
- Done: machine-readable agent registry endpoints
- Done: agent-aware embedding text
- Done: discovery-only agent listing status and manifest trust boundary
- Done: capability-focused registry search endpoint
- Done: semantic agent capability search with match explanations
- Done: auth, interface, and interaction compatibility filters for outside agents
- Done: public registry discovery document and schema endpoint
- Done: agent registry search rate limits and analytics
- Done: admin registry quality checks
- Done: registry categories and stats endpoints
- Done: admin agent search preview
- Done: capability taxonomy and compatibility coverage endpoints
- Done: per-capability manifests with quality signals
- Done: registry policy endpoint and `llms.txt`
- Done: admin registry readiness summary

Still not started:

- follow graph
- activity feeds
- notifications
- paid placement
- promoted search slots
- agent execution

Removed from scope:

- developer portal
- developer self-submission
- developer claim flow

## Current focus

Cotana is now positioned as a stronger discovery product and an early hybrid registry:

- editorial curation exists
- deterministic discovery sections exist
- ranking inputs are inspectable and tunable
- historical data is being accumulated for future charting and trust features
- agent-facing app manifests, capability manifests, semantic capability search, policy docs, and compatibility reports are available for assistant and workflow discovery only

The next major step should deepen agent discovery quality without starting execution, follow graphs, feeds, notifications, or paid placement. Catalog operations stay admin-only.

## Phase 4

Registry quality and trust surfaces are now underway:

- Done: capability quality score and grade
- Done: seeded agent intent test cases in config
- Done: admin readiness buckets for metadata, schemas, safety notes, docs, reliability, and unsafe interaction modes
- Done: subtle app-detail trust badges for machine-readable capabilities
- Done: registry evaluation logs for agent search inspection
- Prepared: historical signal and discovery snapshots remain the base for future trust trend lines

## Phase 4.5

Registry QA and trust trend foundations:

- Done: richer admin evaluation-log filters and single-log detail inspection
- Done: persisted seeded intent test run history with test-set versions
- Done: latest-vs-previous regression comparison for seeded intent tests
- Done: deterministic trust trend query helpers for quality, trust signals, discovery scores, signal availability, and missing metadata
- Done: compact capability distribution by grade, readiness bucket, capability type, auth type, interface type, interaction mode, and listing status
- Done: optional weak metadata fixtures for local/dev/test registry QA
- Done: admin-only registry health export endpoint
- Next: use these helpers for richer admin charts only after enough historical data accumulates

## Phase 4.6

Registry contract stability for outside agents and workflow systems:

- Done: shared registry contract metadata with `schemaVersion`, `registryVersion`, generated timestamp, discovery boundary, and endpoint list
- Done: version metadata across discovery document, registry list, manifests, schema, policy, search, taxonomy, compatibility, stats, and `llms.txt`
- Done: app and capability manifest version fields, update timestamps, review timestamps, and deprecation metadata
- Done: internal registry metadata change history for sensitive admin edits
- Done: deprecated capabilities are excluded from default search while direct manifests can explain deprecation
- Done: public machine-client documentation at `/agent-registry/docs`
- Done: expanded schema contract endpoint for major registry response shapes
- Done: deterministic compatibility confidence scoring
- Done: focused public registry contract tests
- Next: only introduce breaking registry changes behind a new registry/schema version

## Phase 4.7

Launch catalog QA and registry coverage expansion:

- Done: admin-only catalog coverage audit for human category depth, registry category coverage, capability type coverage, and thin-area warnings
- Done: launch seed fixtures gated by `COTANA_SEED_LAUNCH_CATALOG=true`, including strong, average, weak, paused, and deprecated registry examples
- Done: deterministic red-team registry query cases persisted through the existing intent-test run history
- Done: public-safe readiness metadata on registry discovery surfaces without exposing internal health details
- Done: public-safe manifest warnings for deprecated, missing docs, partial schema, unknown reliability, human handoff, and read-only-only surfaces
- Done: admin launch QA page and internal catalog coverage export route
- Next: use the audit to guide real catalog onboarding without adding developer self-submission or paid placement

## Phase 4.8

Staging launch readiness:

- Done: runtime environment validation with pass/warning/fail output, local fallback reporting, invalid URL checks, and invalid boolean/number checks
- Done: public-safe store, registry, and admin health endpoints plus admin-only environment and jobs diagnostics
- Done: explicit local and staging seed workflows with production fixture guards
- Done: separate smoke test command for launch-critical store, registry, llms, and health surfaces
- Done: admin launch checklist covering environment validation, seed coverage, registry readiness, red-team status, intent failures, thin categories, screenshots, updates, weak docs, deprecated capability visibility, and paused listing review
- Done: centralized launch empty-state copy for public and admin edge cases
- Done: registry external-client curl examples and analytics event-name reference

## Phase 4.9

Production preview and beta QA:

- Done: Vercel deployment targets documented for GitHub repo `usercrypto000/cotana`
- Done: production store target set to Vercel project `cotana` with `cotana.xyz`
- Done: admin target documented as Vercel project `cotana-admin`
- Done: safe production migration runbook and preflight helper
- Done: CI expanded to Prisma generate, typecheck, tests, smoke tests, lint, build, and beta E2E command
- Done: small URL-driven beta E2E flow for homepage, categories, search, app detail, registry docs, registry search, admin guard, and health endpoints
- Done: structured logging for health, registry search, jobs, seed guards, and env validation failures
- Done: beta QA checklist document
- Done: admin-safe JSON catalog import workflow with dry-run validation and production write confirmation
- Done: admin launch checklist extended with production readiness acknowledgements

Still out of scope:

- agent execution
- credential handling
- wallet actions
- delegated trading
- follow graph
- activity feeds
- notifications
- paid slots
- promoted search slots
- developer portal
- developer self-submission
- developer claim flow
