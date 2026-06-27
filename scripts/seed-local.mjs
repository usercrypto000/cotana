import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["--filter", "@cotana/db", "db:seed"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    COTANA_SEED_LAUNCH_CATALOG: process.env.COTANA_SEED_LAUNCH_CATALOG ?? "false",
    COTANA_SEED_WEAK_AGENT_FIXTURES: process.env.COTANA_SEED_WEAK_AGENT_FIXTURES ?? "false"
  }
});

process.exit(result.status ?? 1);
