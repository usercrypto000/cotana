This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

**Mindshare Arena V1 (Polling)**

- **Purpose:** Switched Mindshare ingestion from webhook-based (Alchemy/ngrok) to polling via Alchemy ETH RPC.
- **Run the polling worker:** ensure `ALCHEMY_ETH_RPC_URL` is set, then run:

```bash
npx tsx worker/mindshare_polling.ts
```

- **Env vars:** add `ALCHEMY_ETH_RPC_URL`, optional `ETHERSCAN_API_KEY`, and `BOT_FILTER_THRESHOLD`.
- **API:**
	- `GET /api/mindshare?window=24h|7d&mode=raw|filtered&limit=100` — returns ranked addresses with metadata.
	- `GET /api/address/:address` — returns metadata + last 24h/7d stats.

Webhooks and ngrok-based callbacks have been removed/disabled. Use polling worker for local and production setups.

## Linting

- Local: `npm run lint` (uses Next's lint runner)
- Fallback / CI: `npm run lint:ci` (runs ESLint CLI directly)

If `next lint` fails in certain environments, use the `lint:ci` fallback which runs the ESLint CLI across the repository.

## Exploit Tracker MVP

Production-focused, behavior-based exploit detection for EVM chains (no static bad-address lists).

### Scope

- EVM MVP with chain adapters (`Ethereum` + one L2 by default).
- Real-time ingestion of:
  - native transfers
  - ERC20/721/1155 transfers
  - approval events
  - contract creation events
- Rule-based scoring only (no ML).
- Incident generation with alerting (Telegram + generic webhook).
- Minimal JSON API for incidents.

### Data model highlights

- Raw events: `raw_chain_events`
- Normalized transfer model: `transfer_events`
- Address/profile baseline models:
  - `address_profiles`
  - `address_baselines`
- Contract/profile baseline models:
  - `contract_method_stats`
  - `contract_balance_deltas`
  - `contract_baselines`
  - `bridge_profiles`
- Graph + incidents:
  - `entity_graph_edges`
  - `incidents`
  - `incident_rule_hits`

### Detection vectors

- Wallet drain behavior:
  - burst outflow
  - victim clustering
  - approval + sweep
  - fresh sink
  - rapid fan-in/fan-out
- Protocol exploit behavior:
  - abnormal TVL drain
  - method anomaly
  - repetitive call pattern
  - single-caller dominance
  - contract-to-contract siphon
  - price-manipulation signature (lightweight)
- Bridge exploit behavior:
  - unbacked mint
  - liquidity cliff
  - mint -> cashout
  - mint authority anomaly
  - cross-bridge hop
- Oracle attack heuristics:
  - single-block spike proxy
  - spike -> exploit correlation
  - flash liquidity distortion
  - oracle call rarity
  - asymmetric pool drain

### Run locally

1. Copy the runtime contract and set values:

```bash
cp .env.example .env
```

2. Configure required values in `.env` (worker + WS + public APIs):

- `DATABASE_URL`
- `REDIS_URL` (or `REDIS_HOST` + `REDIS_PORT`, or `REDIS_FAKE=true`)
- `EXPLOIT_TRACKER_CHAINS`
- RPC URL per chain in `EXPLOIT_TRACKER_CHAINS`:
  - `ALCHEMY_ETH_RPC_URL` or `RPC_URL_ETH`
  - `ALCHEMY_BASE_RPC_URL` or `RPC_URL_BASE`
  - `ALCHEMY_ARB_RPC_URL` or `RPC_URL_ARB`
  - `ALCHEMY_OP_RPC_URL` or `RPC_URL_OP`
- `EXPLOIT_DEFAULT_API_KEY`
- `EXPLOIT_WS_PORT`

3. Apply DB migration and generate Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Start app + tracker workers:

```bash
npm run dev
npm run tracker:worker
npm run tracker:ws
```

Or one-click with compose:

```bash
docker compose up --build
```

### Incident API

- `GET /api/incidents`
  - query params: `chainId`, `type`, `status`, `minScore`, `limit`
- `GET /api/incidents/:id`
- `PATCH /api/incidents/:id` with body `{ "status": "OPEN|MONITORING|RESOLVED" }`
- `GET /api/incidents/stream` (SSE)
  - query params: `chainId`, `type`, `status`, `minScore`, `limit`, `pollMs`, `updatedAfter`

### Worker entrypoint

- `worker/exploit_tracker.ts`
- Polls configured chains from `EXPLOIT_TRACKER_CHAINS`.
- Maintains per-chain cursor in `exploit_tracker_cursors`.

### Rule tests

Run deterministic scorer tests with synthetic fixtures:

```bash
npm run test:exploit-rules
```
