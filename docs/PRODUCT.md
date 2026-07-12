# Product

## Non-negotiable UX rules

- No connect wallet button
- No visible wallet addresses
- No seed phrase UX
- No blockchain-native copy in the consumer product
- No chain tags on public app cards
- No developer portal
- No public developer self-submission
- Admins are the only people who approve, add, edit, publish, and archive apps
- Public app cards only show logo, name, verified mark, short description, rating, and category

## Identity

- Store auth uses Privy with simple consumer auth, currently email and browser passkeys
- Admin auth uses the same simple auth methods, but access is restricted to allowlisted or `ADMIN` users
- Wallet creation may exist behind the scenes, but wallet UX is not shown in the product
- Cotana uses the shared brand kit in `docs/BRAND_KIT.md`: blue leads product identity, green is reserved for verified and readiness states, and violet is reserved for agent registry surfaces

## User profiles

- Profiles stay minimal
- Profiles can show saved apps, likes, reviews, and lightweight eligibility state
- Featured apps can be considered later as a small profile enhancement
- Profiles should not become social feeds, public graphs, or creator pages in the current product direction

## Current product scope

Cotana is now a discovery channel for humans and AI agents. The public product includes:

- category browsing
- app detail pages with screenshots, likes, private library saves, and reviews
- semantic search with category-aware reranking
- search category filters and sort controls
- editorial shelves on the homepage and category pages
- trending and rising sections
- similar apps on detail pages
- app changelog feeds
- verified badges
- computed community-pick badges
- discovery-only agent sections on hybrid and agent-native app detail pages
- machine-readable agent discovery manifests
- public registry discovery document and schema endpoint
- public capability taxonomy and compatibility reporting for outside agents
- per-capability manifests, registry policy, and `llms.txt` for machine clients
- capability quality scores, registry evaluation logs, and seeded agent intent tests

The admin product includes:

- app create, edit, draft, publish, and unpublish
- tags and screenshots management
- editorial shelf create, edit, reorder, publish, and archive
- changelog entry CRUD per app
- audience, registry status, and structured agent-capability metadata on app records
- moderation queue for flagged reviews
- signal job controls
- discovery inspection and weight tuning panels
- agent registry quality checks
- agent search preview for internal quality checks
- launch checklist acknowledgements for production preview readiness
- admin-safe catalog import operations through dry-run reports and guarded writes

There is no developer-facing submission or claiming flow. If a dapp belongs in Cotana, the admin team adds and maintains it.

## Discovery principles

- Discovery must remain deterministic and inspectable
- LLMs are not on the hot path for ranking
- Semantic retrieval should narrow candidates
- Explicit scoring should decide the final ranking order
- Category-aware formulas should remain configurable without redeploying
- Agent-facing discovery should use semantic capability matching, auth profile, reliability, latency, schema coverage, and safety metadata

## Hybrid agent discovery model

Apps can now be marked as:

- `HUMAN`: built for people only
- `AGENT`: built for AI agents and automated workflows
- `HYBRID`: useful to both people and AI agents

Agent registry publication is controlled separately:

- `NOT_APPLICABLE`: no agent listing exists
- `DRAFT`: metadata exists but agents cannot discover it
- `PUBLISHED`: the listing is visible in the registry
- `PAUSED`: the listing is temporarily hidden

Agent capabilities include:

- name and slug
- description
- capability type
- auth type
- interface type
- interaction mode
- endpoint URL or docs URL
- input and output schemas
- safety notes
- optional reliability and latency metadata

The consumer card surface remains minimal. Agent metadata appears on detail pages and in machine-readable registry endpoints only after the agent listing is published. Cotana never executes the capability, handles credentials, or routes user instructions to the downstream app.

Outside agents can filter registry search by `auth`, `interface`, and `interaction`. This lets agents select compatible surfaces without Cotana needing to know the agent's internal tool stack.

Outside agents can also inspect registry coverage before search. Capability taxonomy shows what kinds of machine-usable surfaces exist, while compatibility reporting shows whether the agent's supported auth, interface, and interaction modes have enough coverage to proceed.

Agents that select a specific result can fetch a per-capability manifest before touching the downstream app. That manifest includes quality signals and repeats the usage boundary so Cotana remains a discovery layer rather than an execution router.

## Registry quality and trust surfaces

Phase 4 deepens agent discovery quality without creating an execution product.

## Phase 4.5: Registry QA and Trust Trend Foundations

Phase 4.5 keeps Cotana hybrid and discovery-only. Human discovery remains in the public store, while agent discovery remains in the machine-readable registry.

This phase adds internal QA surfaces for:

- evaluation-log inspection with filters for date range, query, category, capability type, auth/interface/interaction mode, readiness bucket, matched app, and blocking issue count
- single evaluation-log detail views showing query filters, candidate counts, exclusions, matched capability, scores, quality score, and match reason
- persisted seeded intent test runs with run version, expected category/app/capability, actual top result, score, quality score, pass/fail state, and failure reason
- latest-vs-previous intent test comparison for newly failing, newly passing, and unchanged failing tests
- capability quality distribution by grade, readiness bucket, capability type, auth type, interface type, interaction mode, and registry listing status
- admin-only trust trend previews and registry health export JSON
- optional local weak-metadata fixtures for schemas, safety notes, docs-only surfaces, low reliability, unsafe modes, and weak endpoint metadata

Unchanged non-goals: Cotana does not execute agent actions, handle credentials, initiate wallet actions, delegate trading, build follow graphs, publish feeds, send notifications, sell paid placement, expose promoted search slots, or offer developer self-submission.

## Phase 4.6: Registry Contract Stability

Phase 4.6 makes the machine-readable registry stable enough for outside agents, assistants, and workflow systems to inspect without ambiguity.

Public registry surfaces now include shared contract metadata:

- `schemaVersion`
- `registryVersion`
- `generatedAt`
- discovery-only boundary metadata
- supported endpoint metadata

App and capability manifests expose current manifest versions and review/deprecation metadata. Internal admin change logs track registry-sensitive edits, including audience, listing status, capability status, auth/interface/interaction changes, schemas, docs URLs, safety notes, reliability, and latency metadata.

Deprecated capabilities are excluded from default search results. Direct capability manifests may still explain deprecation status and replacement docs. Paused listings remain hidden from the public registry.

Public machine-client docs live at `/agent-registry/docs`, linked from discovery surfaces, `llms.txt`, and policy metadata. These docs explain endpoints, query parameters, filters, response shapes, versioning, deprecation, rate limits, and the no-execution rule. They are not a developer portal and do not add submission or claim flows.

Compatibility reports now include deterministic confidence scoring with a score, grade, reasons, blocking gaps, and recommended filter changes.

- Each capability has a quality score based on schema completeness, docs availability, endpoint presence, safety notes, auth friction, latency tier, reliability tier, and interaction mode
- Agent intent tests check whether seeded intents land on the expected capability types
- Admin readiness buckets separate ready listings from missing metadata, unsafe interaction mode, missing schema, missing safety notes, weak docs, and low reliability
- App detail pages show subtle trust cues such as machine-readable, read-only capability, schema available, safety notes available, and docs available
- Agent searches are logged for inspection with query, filters, matched capability, similarity, score, match reason, excluded candidates, and blocking issue count
- Historical signal snapshots and discovery insight snapshots remain the data foundation for future trend lines and trust charts

## Editorial shelves

Shelves are admin-managed and support:

- title
- slug
- description
- status
- sort order
- visibility
- optional category scope
- optional homepage pinning
- ordered app membership

Supported editorial patterns now include:

- featured
- best for beginners
- new this week
- category-specific shelves

## Trending

Trending is computed from recent discovery activity, not from opaque AI output.

Default inputs:

- recent page-view velocity
- search CTR
- like velocity
- review velocity
- recent signal momentum when applicable

Trending exists globally and by category.

## Rising

Rising is distinct from trending and rewards acceleration instead of absolute size.

Default inputs:

- growth in views
- growth in search clicks
- growth in likes
- growth in reviews
- signal momentum
- low-history boost for smaller or newer apps

Rising exists globally and by category.

## Reviews and moderation

A user can review an app only when all of the following are true:

- account age is greater than 24 hours
- display name exists
- avatar exists
- at least 3 app detail views are recorded
- at least 48 hours have passed since the last published review
- the user has not already reviewed that app
- the review body is at least 80 characters long

Reviews publish immediately when eligible. Reviews are not pre-moderated.

Flagged reviews remain visible until an admin dismisses or removes them.

## Trust signals

Verified:

- assigned by admins
- visible on cards and detail pages
- backed by an internal note
- not a direct ranking shortcut by itself

Community pick:

- computed monthly
- based on rating quality, review count quality, like velocity, engagement quality, and moderation safety
- visible publicly as a badge only
- stored internally with explanation metadata for debugging

## Historical data

Cotana now stores:

- weekly app signal snapshots for future charting
- discovery insight snapshots for trending, rising, and community-pick debugging

This gives the product a usable historical foundation before public trend lines are exposed.

## Phase 4.7 launch QA

Cotana now has an admin-only catalog coverage audit for launch readiness. It summarizes human category depth, screenshots, reviews, updates, verified/community-pick coverage, signal snapshots, registry listing coverage, capability quality, schema/docs/safety coverage, read-only coverage, and thin-area warnings.

The public agent registry now includes a public-safe readiness object and manifest quality warnings. These help outside agents understand coverage and manifest caveats without exposing admin health exports, internal notes, or unpublished readiness buckets.

Registry red-team queries live beside seeded intent tests and persist run history. They cover empty or irrelevant queries, risky write or transactional intents, unsupported credential-like requests, wrong-category cases, and normal read-only discovery. They remain QA checks only; they do not route instructions or execute actions.

## Phase 4.8 staging launch readiness

Cotana now has staging launch readiness surfaces for operators:

- seed commands create a non-empty public homepage with spotlight, trending, rising, and category app rows
- seeded app detail pages include screenshots, reviews, updates, similar apps, and trust states
- admin `/launch-checklist` shows public seed visibility counters for published apps, shelves, discovery rows, category coverage, screenshots, reviews, updates, registry listings, and active capabilities
- `pnpm test:smoke` asserts seeded public cards exist on homepage, category, and detail surfaces

First-release public surfaces should not show empty states when seed data is loaded. Empty states are reserved for genuinely missing shelves, discovery rows, categories, screenshots, reviews, updates, or similar apps.

- environment health shows required configuration, optional configuration, invalid values, and local fallbacks
- deployment health endpoints report safe status for store, admin, registry, and jobs
- launch checklist summarizes whether the catalog and registry are ready for a staging handoff
- smoke tests cover homepage, category, search, app detail, registry discovery, registry search, schema, `llms.txt`, health, and protected admin QA routes
- registry docs include curl examples for outside agents

These are launch QA tools. They do not create developer submission, paid placement, notifications, feeds, wallet actions, credential handling, or execution.
