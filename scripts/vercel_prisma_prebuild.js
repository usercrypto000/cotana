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
  run("npx prisma migrate deploy");
} else {
  console.log("[prebuild] Skipping prisma migrate deploy (DATABASE_URL missing).");
}

run("npx prisma generate");
