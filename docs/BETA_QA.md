# Beta QA Checklist

Run this checklist against the beta preview before beta handoff.

Current beta preview URLs:

- Store: `https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app`
- Admin: `https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app`

## Beta URL Check

Run one command before manual QA:

```bash
COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e
```

The checker prints each route with `pass`, `warn`, or `fail`, the HTTP status, the reason, and the next action. Protected admin preview responses are expected and should not be treated as deployment failures.

## Environment

- Store URL loads at the beta preview URL
- Admin URL loads at the beta preview URL or Vercel protection page
- store `/api/health` returns `ok` or `ok_with_warnings`
- registry `/api/agent-registry/health` returns `ok` or `ok_with_warnings`
- admin `/api/health` is protected by Vercel auth, returns a valid admin health payload, or returns the admin shell with an auth configuration warning
- admin launch checklist is reachable by an authenticated admin
- 15 app records are visible from `/api/apps`
- `/apps/harbor-yield` shows the Trust Profile

## Preview Env Checklist

Missing required env:

- `DATABASE_URL` must be present for store, registry, and admin preview
- `ADMIN_ALLOWLIST_EMAIL` must be present before authenticated admin QA

Missing env that causes warning-only preview health:

- `REDIS_URL`, preview can use the in-memory fallback for public route QA
- `NEXT_PUBLIC_PRIVY_APP_ID`, public discovery can be tested without signed-in flows
- `PRIVY_APP_SECRET`, session sync cannot be tested until configured
- `COTANA_SESSION_SECRET`, authenticated sessions need it
- `POSTHOG_KEY`, analytics capture is optional for preview
- `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`, background jobs are optional for route QA
- `AI_GATEWAY_API_KEY` or Vercel OIDC, embedding refresh is optional for route QA
- `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_ADMIN_URL`, and `NEXT_PUBLIC_REGISTRY_URL`, preview routes still resolve from the request origin

Intentionally absent in preview:

- production fixture seed flags
- production import confirmation flags
- production-only domains such as `https://cotana.xyz`

Production-only required env:

- `DIRECT_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_STORE_URL`
- `NEXT_PUBLIC_ADMIN_URL`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `COTANA_SESSION_SECRET`
- `POSTHOG_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- Vercel AI Gateway credentials through OIDC or `AI_GATEWAY_API_KEY`

## Health Status Meanings

- `ok`: every required and optional dependency is configured
- `ok_with_warnings`: required dependencies are healthy, but preview-only or optional dependencies are missing
- `degraded`: a required non-database dependency is missing or unavailable
- `unhealthy`: the database is unavailable or the health route cannot build a safe response

## Accounts and Admin

- user can create an account with the enabled simple auth method
- admin access is blocked when unauthenticated
- admin access works for allowlisted or `ADMIN` users
- admin can create a draft app
- admin can edit app metadata, tags, screenshots, and changelog
- admin can publish and unpublish an app

## Public Discovery

- homepage renders published apps from the database
- homepage and `/api/apps` expose at least 15 published beta records
- category browsing works for at least DeFi, Lending & Yield, and Prediction Markets
- search returns results for `yield`, `prediction markets`, and `swap`
- category filters work
- sort controls work for relevance, highest rated, most reviewed, trending, and newest
- app detail pages load
- `/apps/harbor-yield` renders the Trust Profile
- public app cards stay minimal
- no wallet UI, wallet address, seed phrase UX, or chain tags appear

## Engagement

- signed-in user can like an app
- signed-in user can save an app to private library
- private library renders saved apps
- review eligibility reasons render clearly
- eligible review creation works
- review flagging works
- flagged reviews appear in admin moderation
- admin can dismiss or remove a flagged review

## Phase 2 Discovery

- editorial shelves render on homepage
- category-scoped shelves render where configured
- trending renders globally and by category
- rising renders separately from trending
- similar apps render on app detail pages
- changelog entries render newest-first
- verified badge appears consistently
- community pick badge appears only when computed

## Agent Registry

- `/.well-known/cotana-agent-registry` loads
- `/api/agent-registry` loads
- `/api/agent-registry/search?q=yield%20rates` returns a results array
- `/api/agent-registry/compatibility` loads
- capability manifests load for seeded capabilities
- `/api/agent-registry/schema` loads
- `/api/agent-registry/policy` loads
- `/llms.txt` loads
- registry search logs appear in admin evaluation logs

## Launch Checklist

- environment validation is passing
- beta env status is visible
- deployment health status is visible
- beta app records visible is passing
- Harbor Yield Trust Profile is passing
- registry endpoints reachable is passing
- Redis preview status is passing or warning-only
- Privy preview status is passing or warning-only
- admin preview protection is expected
- seed fixture review validation is passing
- staging seed loaded is acknowledged
- catalog coverage acceptable is acknowledged
- registry coverage acceptable is acknowledged
- red-team tests are passing
- smoke tests are passing
- E2E tests are passing
- migration status checked is acknowledged
- production seed guard active is acknowledged
- docs updated is acknowledged
- known warnings are acknowledged

## Commands

```bash
pnpm typecheck
pnpm test
pnpm test:smoke
pnpm lint
pnpm build
COTANA_E2E_STORE_URL=https://cotana.xyz COTANA_E2E_ADMIN_URL=https://cotana-admin.vercel.app pnpm test:e2e
COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e
```
