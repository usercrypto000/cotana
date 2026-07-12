import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to run staging fixture seed with NODE_ENV=production.");
  process.exit(1);
}

if (process.env.COTANA_STAGING_SEED_CONFIRM !== "true") {
  console.error("Set COTANA_STAGING_SEED_CONFIRM=true before inserting staging launch fixtures.");
  process.exit(1);
}

const result = spawnSync("pnpm", ["--filter", "@cotana/db", "db:seed"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    COTANA_SEED_LAUNCH_CATALOG: "true",
    COTANA_SEED_WEAK_AGENT_FIXTURES: process.env.COTANA_SEED_WEAK_AGENT_FIXTURES ?? "true"
  }
});

process.exit(result.status ?? 1);
