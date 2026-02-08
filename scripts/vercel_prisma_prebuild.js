/* eslint-disable no-console */
const { execSync } = require("node:child_process");

function hasNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function run(cmd) {
  execSync(cmd, {
    stdio: "inherit",
    env: process.env,
  });
}

// Keep builds deterministic on Vercel by applying migrations before generating the client.
// Locally, we avoid running migrations as part of `npm run build` because many dev setups
// intentionally don't have a DB running during a frontend-only build.
const isVercel = process.env.VERCEL === "1" || process.env.VERCEL === "true";

if (!isVercel) {
  console.log("[prebuild] Skipping Prisma prebuild (not on Vercel).");
  process.exit(0);
}

if (hasNonEmpty(process.env.DATABASE_URL)) {
  // Neon/Vercel Postgres often provides a pooled (pgbouncer) hostname containing `-pooler`.
  // Prisma migrations rely on advisory locks and can time out behind a pooler, so prefer the
  // direct endpoint for migrations when we can safely derive it.
  try {
    const u = new URL(process.env.DATABASE_URL);
    if (u.hostname.includes("-pooler.")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
      process.env.DATABASE_URL = u.toString();
      console.log("[prebuild] Using direct (non-pooler) DATABASE_URL for prisma migrate deploy.");
    }
  } catch {
    // If parsing fails, fall back to the original DATABASE_URL.
  }
  run("npx prisma migrate deploy");
} else {
  console.log("[prebuild] Skipping prisma migrate deploy (DATABASE_URL missing).");
}

run("npx prisma generate");
