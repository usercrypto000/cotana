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

- `OPENAI_API_KEY` enables production embeddings
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

Seeded agent intent tests live in `ConfigKV` at `agent.intent_tests`. Admins should use them to catch obvious search regressions such as yield intents ranking prediction-market capabilities.

Registry evaluation logs are written for agent searches. Inspect them when debugging result quality: query, filters, candidate count, matched capability, similarity, score, quality score, excluded candidates, and blocking issue count should explain why the search behaved the way it did.

## Testing and release checks

Run this validation set before shipping:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Current known build note:

- Next builds emit a non-fatal Privy warning about the optional `@farcaster/mini-app-solana` module in both apps
