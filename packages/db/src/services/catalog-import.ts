import { AppStatus } from "@prisma/client";
import type { AdminAppInput } from "./apps";

export type CatalogImportRow = {
  slug?: string;
  name?: string;
  categorySlug?: string;
  shortDescription?: string;
  longDescription?: string;
  websiteUrl?: string;
  logoUrl?: string;
  verified?: boolean | string;
  tags?: string[] | string;
  screenshots?: string[] | string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | string;
};

export type CatalogImportValidatedRow = {
  rowNumber: number;
  input: AdminAppInput;
  status: AppStatus;
};

export type CatalogImportInvalidRow = {
  rowNumber: number;
  errors: string[];
  row: CatalogImportRow;
};

export type CatalogImportPlan = {
  validRows: CatalogImportValidatedRow[];
  invalidRows: CatalogImportInvalidRow[];
  dryRun: boolean;
  canWrite: boolean;
};

function parseStringList(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    return value.map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function parseBoolean(value: boolean | string | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "yes", "verified"].includes(value.trim().toLowerCase());
  }

  return false;
}

function normalizeStatus(value: CatalogImportRow["status"]) {
  if (value === AppStatus.PUBLISHED) {
    return AppStatus.PUBLISHED;
  }

  if (value === AppStatus.ARCHIVED) {
    return AppStatus.ARCHIVED;
  }

  return AppStatus.DRAFT;
}

function canParseUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function validateCatalogImportRows(
  rows: CatalogImportRow[],
  categories: Array<{ id: string; slug: string }>,
  options: {
    dryRun?: boolean;
    allowWrite?: boolean;
  } = {},
): CatalogImportPlan {
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const validRows: CatalogImportValidatedRow[] = [];
  const invalidRows: CatalogImportInvalidRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];
    const category = row.categorySlug ? categoryBySlug.get(row.categorySlug) : null;

    for (const field of ["name", "shortDescription", "longDescription", "websiteUrl", "logoUrl", "categorySlug"] as const) {
      if (!row[field]?.trim()) {
        errors.push(`${field} is required.`);
      }
    }

    if (row.websiteUrl && !canParseUrl(row.websiteUrl)) {
      errors.push("websiteUrl must be a valid URL.");
    }

    if (row.logoUrl && !canParseUrl(row.logoUrl)) {
      errors.push("logoUrl must be a valid URL.");
    }

    if (row.categorySlug && !category) {
      errors.push(`Unknown categorySlug: ${row.categorySlug}.`);
    }

    if (errors.length > 0 || !category) {
      invalidRows.push({
        rowNumber,
        errors,
        row
      });
      return;
    }

    validRows.push({
      rowNumber,
      status: normalizeStatus(row.status),
      input: {
        slug: row.slug,
        name: row.name?.trim() ?? "",
        shortDescription: row.shortDescription?.trim() ?? "",
        longDescription: row.longDescription?.trim() ?? "",
        websiteUrl: row.websiteUrl?.trim() ?? "",
        logoUrl: row.logoUrl?.trim() ?? "",
        verified: parseBoolean(row.verified),
        verifiedNote: null,
        categoryId: category.id,
        tags: parseStringList(row.tags),
        screenshots: parseStringList(row.screenshots)
      }
    });
  });

  return {
    validRows,
    invalidRows,
    dryRun: options.dryRun ?? true,
    canWrite: Boolean(options.allowWrite) && invalidRows.length === 0
  };
}

export function parseCatalogImportJson(value: string): CatalogImportRow[] {
  const parsed = JSON.parse(value) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as CatalogImportRow[];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "apps" in parsed &&
    Array.isArray((parsed as { apps?: unknown }).apps)
  ) {
    return (parsed as { apps: CatalogImportRow[] }).apps;
  }

  throw new Error("Catalog import JSON must be an array or an object with an apps array.");
}
