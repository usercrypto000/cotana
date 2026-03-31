export const appStatusValues = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type AppStatusValue = (typeof appStatusValues)[number];

export const AppStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
} as const satisfies Record<AppStatusValue, AppStatusValue>;
