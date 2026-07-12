import { describe, expect, it } from "vitest";
import { getProductionMigrationPreflight } from "./migrations";

describe("production migration preflight", () => {
  it("passes when production migration inputs are acknowledged", () => {
    const checks = getProductionMigrationPreflight({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db",
      DIRECT_URL: "postgresql://direct",
      COTANA_MIGRATION_STATUS_CHECKED: "true"
    } as NodeJS.ProcessEnv);

    expect(checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("fails when fixture seeds are enabled", () => {
    const checks = getProductionMigrationPreflight({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db",
      DIRECT_URL: "postgresql://direct",
      COTANA_SEED_LAUNCH_CATALOG: "true",
      COTANA_MIGRATION_STATUS_CHECKED: "true"
    } as NodeJS.ProcessEnv);

    expect(checks.find((check) => check.id === "fixture-seeds-disabled")?.status).toBe("fail");
  });
});
