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

Still out of scope:

- agent execution
- credential handling
- follow graph
- notifications
- paid slots
