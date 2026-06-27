# Deployment

Cotana deploys from the GitHub repository `usercrypto000/cotana`.

## Vercel Targets

- Store project: `cotana`
- Store project id: `prj_yaOIBs4AOh8CTsTd2d101waV5EIU`
- Store production domain: `https://cotana.xyz`
- Admin project: `cotana-admin`
- Admin project id: `prj_VLTSKcPDS0F1JcFVphm08v4xu5Qc`
- Admin production URL: `https://cotana-admin.vercel.app`
- Vercel team id: `team_1zJHST7CZfbOjBYh89rHmYih`

The public registry uses the store domain. `NEXT_PUBLIC_REGISTRY_URL` should point to `https://cotana.xyz/.well-known/cotana-agent-registry` in production.

## Monorepo Build Shape

Cotana prepares deployable app bundles with:

```bash
pnpm deploy:prepare
```

The command creates:

- `.vercel-bundles/store`
- `.vercel-bundles/admin`

Each bundle includes the target Next.js app plus the shared workspace packages it needs.

## Store Deployment

Use the Vercel project `cotana`.

- Root directory: `.vercel-bundles/store`
- Install command: `npm install --include=dev`
- Build command: `npm run build`
- Framework preset: Next.js
- Node version: 24.x
- Production domain: `cotana.xyz`

Production environment values must include:

- `NEXT_PUBLIC_STORE_URL=https://cotana.xyz`
- `NEXT_PUBLIC_REGISTRY_URL=https://cotana.xyz/.well-known/cotana-agent-registry`

## Admin Deployment

Use the Vercel project `cotana-admin`.

- Root directory: `.vercel-bundles/admin`
- Install command: `npm install --include=dev`
- Build command: `npm run build`
- Framework preset: Next.js
- Node version: 24.x
- Production URL: `https://cotana-admin.vercel.app`

Production environment values must include:

- `NEXT_PUBLIC_ADMIN_URL=https://cotana-admin.vercel.app`
- the same database, Redis, Privy, Inngest, PostHog, and provider keys as the store environment

## Shared Packages

The Vercel bundle step rewrites workspace dependencies into local file dependencies. Shared packages are not deployed as separate services.

Included packages:

- `packages/analytics`
- `packages/auth`
- `packages/config`
- `packages/db`
- `packages/search`
- `packages/types`
- `packages/ui`

## Prisma

Prisma generation is handled by the bundle `postinstall` command:

```bash
prisma generate --schema ./packages/db/prisma/schema.prisma
```

Run migrations separately before promoting production traffic.

## Migration Workflow

Local development:

```bash
pnpm db:migrate
pnpm db:seed
```

Staging:

```bash
pnpm db:migrate:deploy
COTANA_STAGING_SEED_CONFIRM=true pnpm seed:staging
```

Production:

```bash
pnpm db:migrate:deploy
```

Do not run fixture seeds in production. `COTANA_SEED_LAUNCH_CATALOG` and `COTANA_SEED_WEAK_AGENT_FIXTURES` must stay disabled for production.

## Production Migration Preflight

Before production migration:

- confirm `DATABASE_URL` points at production
- confirm `DIRECT_URL` points at direct production database access
- confirm pgvector is available
- run `pnpm db:generate`
- inspect pending SQL migrations
- confirm no fixture seed flags are enabled
- confirm database backup or restore point exists
- set `COTANA_MIGRATION_STATUS_CHECKED=true` only after the check is complete

Rollback expectation:

- migrations are forward-only by default
- rollback means restoring a database backup or shipping a corrective migration
- never run local reset scripts against staging or production

## Preview vs Production

Preview deployments can use isolated preview databases and preview Redis. Production must use production database, Redis, Privy, Inngest, and PostHog environments.

`cotana.xyz` is the production store domain. Preview URLs should stay on Vercel preview domains unless a dedicated preview domain is added later.

Current beta preview URLs:

- Store: `https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app`
- Admin: `https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app`

Preview health can return `ok_with_warnings` when the database is reachable and missing dependencies are optional for public route QA. Missing `REDIS_URL`, Privy credentials, PostHog, Inngest, AI Gateway credentials, or public URL envs should be treated as preview warnings unless authenticated flows or background jobs are being tested.

Production promotion is stricter. Before production, configure `DIRECT_URL`, `REDIS_URL`, `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_ADMIN_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `PRIVY_APP_SECRET`, `COTANA_SESSION_SECRET`, `POSTHOG_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, and Vercel AI Gateway through OIDC or `AI_GATEWAY_API_KEY`.

Admin preview should remain protected. Automated beta URL checks treat Vercel auth, the admin session guard, or an admin shell with an auth configuration warning as a non-failing preview result. Manual admin health still requires configured Privy preview credentials and an authenticated admin session.

Run beta URL verification with:

```bash
COTANA_E2E_STORE_URL=https://cotana-d6jswv85k-usercrypto000s-projects.vercel.app COTANA_E2E_ADMIN_URL=https://cotana-admin-ftoqcbq70-usercrypto000s-projects.vercel.app pnpm test:e2e
```
