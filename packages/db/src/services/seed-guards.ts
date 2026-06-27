import { logServerEvent } from "@cotana/config/runtime";

export function assertSeedFixturesAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (
    env.NODE_ENV === "production" &&
    (env.COTANA_SEED_LAUNCH_CATALOG === "true" || env.COTANA_SEED_WEAK_AGENT_FIXTURES === "true")
  ) {
    logServerEvent("error", "Blocked production fixture seed attempt.", {
      scope: "seed-guard",
      nodeEnv: env.NODE_ENV
    });
    throw new Error("Fixture seed flags are disabled in production.");
  }
}

export function assertStagingSeedAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === "production") {
    logServerEvent("error", "Blocked staging seed attempt in production.", {
      scope: "seed-guard",
      nodeEnv: env.NODE_ENV
    });
    throw new Error("Refusing to run staging fixture seed with NODE_ENV=production.");
  }

  if (env.COTANA_STAGING_SEED_CONFIRM !== "true") {
    logServerEvent("warn", "Blocked staging seed attempt without confirmation.", {
      scope: "seed-guard"
    });
    throw new Error("Set COTANA_STAGING_SEED_CONFIRM=true before inserting staging launch fixtures.");
  }
}
