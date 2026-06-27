import { spawnSync } from "node:child_process";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to reset a production database.");
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["--filter", "@cotana/db", "exec", "prisma", "migrate", "reset", "--force", "--schema", "prisma/schema.prisma"],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development"
    }
  },
);

process.exit(result.status ?? 1);
