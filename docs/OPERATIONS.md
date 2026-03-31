# Operations

This document will track deployment steps, provider setup, moderation operations, and scheduled job ownership.

## Current notes

- Set `ADMIN_ALLOWLIST_EMAIL` before running the seed script so the local admin account is created correctly
- Run `pnpm db:generate`, `pnpm db:migrate`, and `pnpm db:seed` before starting the apps
- The first migration enables the `vector` extension, so local PostgreSQL must support pgvector
- Moderation currently happens from the admin review queue, where flagged reviews can be dismissed or removed
- Redis is optional for local development, but recommended for realistic cache and rate-limit behavior

## Job schedule

- `signals.refresh.lending_yield`: every 4 hours
- `signals.refresh.defi`: every 6 hours
- `signals.refresh.prediction_markets`: every 6 hours
- `snapshots.weekly`: Sunday 00:00 UTC
- `trending.recompute`: every hour
- `community_pick.recompute`: placeholder schedule

## Provider configuration

- `OPENAI_API_KEY` enables production embeddings
- `DUNE_API_KEY` enables Dune-backed signal enrichment
- `DUNE_DEFI_QUERY_ID`, `DUNE_LENDING_YIELD_QUERY_ID`, and `DUNE_PREDICTION_MARKETS_QUERY_ID` should point at the query ids used for category metrics
- `DEFILLAMA_API_KEY` is optional and only needed if the provider configuration requires authenticated access

## Runtime behavior

- Search responses are cached by normalized query and optional category hint
- App detail API responses are cached for anonymous reads
- Review creation and flagging enforce cooldowns and rate limits
- Trending results are stored in both Redis and `ConfigKV` so the system retains a durable fallback
