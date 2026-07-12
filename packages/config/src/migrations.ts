export type MigrationPreflightCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
};

export function getProductionMigrationPreflight(env: NodeJS.ProcessEnv = process.env): MigrationPreflightCheck[] {
  return [
    {
      id: "database-url",
      label: "DATABASE_URL is configured",
      status: env.DATABASE_URL ? "pass" : "fail"
    },
    {
      id: "direct-url",
      label: "DIRECT_URL is configured for direct migration access",
      status: env.DIRECT_URL ? "pass" : "fail"
    },
    {
      id: "production-env",
      label: "NODE_ENV is production",
      status: env.NODE_ENV === "production" ? "pass" : "fail"
    },
    {
      id: "fixture-seeds-disabled",
      label: "Fixture seed flags are disabled",
      status:
        env.COTANA_SEED_LAUNCH_CATALOG === "true" || env.COTANA_SEED_WEAK_AGENT_FIXTURES === "true"
          ? "fail"
          : "pass"
    },
    {
      id: "migration-reviewed",
      label: "Migration status was checked",
      status: env.COTANA_MIGRATION_STATUS_CHECKED === "true" ? "pass" : "fail"
    }
  ];
}
