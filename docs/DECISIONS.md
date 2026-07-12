# Decisions

This document will hold short ADR-style notes when the implementation makes a meaningful architectural tradeoff.

## Current decisions

- Privy remains the only visible auth layer, with Cotana issuing its own HttpOnly session cookie for server authorization
- Admin authorization is enforced through allowlisted email and local `ADMIN` role checks
- Public data reads happen through Prisma-backed server components, while mutations use route handlers for consistency
- Review eligibility is centralized in one shared DB service rather than duplicated across routes and pages

## Phase 4.5 registry QA

- Registry QA stays admin-only; public agent registry endpoints remain discovery-only and read-only
- Seeded intent tests remain configured in `ConfigKV`, while historical results persist in `AgentRegistryIntentTestRun`
- Evaluation logs persist deterministic search diagnostics, including filters, top-match metadata, quality score, and exclusions, so QA can debug ranking without putting LLMs in the hot path
- Trust trend helpers read existing snapshots and logs first; charting can be layered on later without changing the data access contract
- Weak metadata fixtures are opt-in through `COTANA_SEED_WEAK_AGENT_FIXTURES=true` to avoid polluting production seed data
- Developer portals, self-submission, claim flows, paid slots, notifications, feeds, social graph features, wallet actions, credential handling, and agent execution remain non-goals

## Phase 4.6 registry contract stability

- Registry contract metadata is centralized in `@cotana/config` so public routes do not drift on version strings or endpoint lists
- Public registry responses can add compatible fields within a registry version, but breaking response-shape changes require a new `schemaVersion` or `registryVersion`
- Manifest versioning is stored on app registry listings and individual capabilities rather than inferred only from timestamps
- Registry-sensitive admin edits are recorded in `AgentRegistryChangeLog`; the log is internal and must not leak into public machine-client responses
- Deprecated capability metadata is retained for direct manifest explanation, while default search stays focused on active capabilities
- Compatibility confidence is deterministic and based on coverage and metadata quality, not LLM judgment
- Public machine-client docs explain how to inspect Cotana; they are deliberately separate from any developer portal or self-submission flow

## Phase 4.7 launch catalog QA

- Catalog coverage audit is admin-only because it includes operational readiness warnings, not public product claims
- Public readiness metadata is intentionally summary-level so outside agents can inspect coverage without receiving internal health exports
- Manifest warnings are limited to public-safe caveats and must not expose unpublished readiness buckets or admin notes
- Red-team registry queries reuse intent-test history instead of adding a separate persistence model, keeping QA comparisons in one place
- Launch catalog seed expansion is gated by `COTANA_SEED_LAUNCH_CATALOG=true` so production seed data remains controlled

## Phase 4.8 staging launch readiness

- Environment validation is centralized in `@cotana/config` so runtime checks, health endpoints, tests, and admin diagnostics stay consistent
- Public health endpoints expose only safe booleans, environment, build metadata, registry version, and timestamp
- Detailed environment diagnostics and jobs health remain admin-only
- Staging fixture insertion requires `COTANA_STAGING_SEED_CONFIRM=true` and is refused in production
- Smoke tests are separate from unit tests because they verify launch-critical route wiring rather than isolated formulas
- Registry examples are curl/read-only examples only; they do not imply execution or credential routing

## Phase 4.9 production preview

- `cotana.xyz` is the production public store and registry domain, served by the Vercel project `cotana`
- `cotana-admin` remains a separate protected Vercel project instead of sharing the public domain by default
- `usercrypto000/cotana` is the deployment source of truth for both apps
- Beta E2E checks are URL-driven scripts rather than a large browser suite, keeping launch QA small and operational
- Catalog import is admin-controlled and dry-run-first; it is not a developer submission path
- Production imports require `COTANA_CONFIRM_PRODUCTION_IMPORT=true` so accidental writes are harder to trigger
- Production migrations are forward-only, with rollback handled by database restore or corrective migration
