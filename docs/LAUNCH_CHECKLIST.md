# Cotana Hack Tracker: Fresh-Machine Boot Checklist

This checklist is the canonical "new machine, no local state" boot for the public Hack Tracker.

## Prereqs

- `git`
- Node.js + `npm` (same major version used by the repo)
- Docker + Docker Compose (`docker compose`)

## 1) Clone

```bash
git clone https://github.com/usercrypto000/cotana.git
cd cotana
```

## 2) Environment

Copy and fill the runtime contract:

```bash
cp .env.example .env
```

Required for end-to-end (worker + ws + api + ui):

- `DATABASE_URL`
- `REDIS_URL` (or `REDIS_HOST` + `REDIS_PORT`, or `REDIS_FAKE=true`)
- `EXPLOIT_TRACKER_CHAINS`
- RPC for each chain in `EXPLOIT_TRACKER_CHAINS`:
  - `1`: `ALCHEMY_ETH_RPC_URL` or `RPC_URL_ETH`
  - `8453`: `ALCHEMY_BASE_RPC_URL` or `RPC_URL_BASE`
  - `42161`: `ALCHEMY_ARB_RPC_URL` or `RPC_URL_ARB`
  - `10`: `ALCHEMY_OP_RPC_URL` or `RPC_URL_OP`
- `EXPLOIT_DEFAULT_API_KEY` (long random token)
- `EXPLOIT_JWT_SECRET` (long random secret)
- `EXPLOIT_WS_PORT` (defaults to `8099` if set in `.env.example`)

Optional:

- Alerts: `EXPLOIT_ALERT_WEBHOOK_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## 3) Database + Redis

Start only the backing services:

```bash
docker compose up -d postgres redis
```

## 4) Install + Migrations

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
```

## 5) Start Services (three terminals)

Terminal A (worker):

```bash
npm run tracker:worker
```

Terminal B (websocket server):

```bash
npm run tracker:ws
```

Terminal C (web app + public APIs):

```bash
npm run dev
```

## 6) Verification

- `GET http://localhost:3000/api/public/status` returns `ok` and includes `x-cotana-api-version`
- `GET http://localhost:3000/api/public/incidents/live` returns a JSON envelope (may be empty on brand-new DB)
- `http://localhost:3000/incidents` renders without errors

## 7) Stop

- Stop the three terminals (`Ctrl+C`)
- Stop backing services:

```bash
docker compose down
```
