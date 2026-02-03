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
