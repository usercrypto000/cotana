export const editorialShelfStatusValues = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type EditorialShelfStatusValue = (typeof editorialShelfStatusValues)[number];

export const EditorialShelfStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
} as const satisfies Record<EditorialShelfStatusValue, EditorialShelfStatusValue>;

export const editorialShelfVisibilityValues = ["HOME", "CATEGORY", "BOTH"] as const;

export type EditorialShelfVisibilityValue = (typeof editorialShelfVisibilityValues)[number];

export const EditorialShelfVisibility = {
  HOME: "HOME",
  CATEGORY: "CATEGORY",
  BOTH: "BOTH"
} as const satisfies Record<EditorialShelfVisibilityValue, EditorialShelfVisibilityValue>;
