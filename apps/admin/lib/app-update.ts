export const appUpdateTypeValues = ["GENERAL", "FEATURE", "FIX", "PERFORMANCE", "SECURITY"] as const;

export type AppUpdateTypeValue = (typeof appUpdateTypeValues)[number];

export const AppUpdateType = {
  GENERAL: "GENERAL",
  FEATURE: "FEATURE",
  FIX: "FIX",
  PERFORMANCE: "PERFORMANCE",
  SECURITY: "SECURITY"
} as const satisfies Record<AppUpdateTypeValue, AppUpdateTypeValue>;
