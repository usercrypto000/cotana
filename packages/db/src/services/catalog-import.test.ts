import { describe, expect, it } from "vitest";
import { parseCatalogImportJson, validateCatalogImportRows } from "./catalog-import";

const categories = [
  {
    id: "cat_defi",
    slug: "defi"
  }
];

describe("catalog import validation", () => {
  it("validates dry-run rows without allowing writes by default", () => {
    const plan = validateCatalogImportRows(
      [
        {
          name: "Import App",
          categorySlug: "defi",
          shortDescription: "Simple discovery app.",
          longDescription: "A longer internal import example for beta catalog operations.",
          websiteUrl: "https://example.com",
          logoUrl: "https://example.com/logo.png",
          tags: "defi|analytics",
          screenshots: "https://example.com/one.png,https://example.com/two.png",
          verified: "true"
        }
      ],
      categories,
    );

    expect(plan.invalidRows).toHaveLength(0);
    expect(plan.validRows[0]?.input.tags).toEqual(["defi", "analytics"]);
    expect(plan.validRows[0]?.input.verified).toBe(true);
    expect(plan.dryRun).toBe(true);
    expect(plan.canWrite).toBe(false);
  });

  it("reports invalid rows before insert", () => {
    const plan = validateCatalogImportRows(
      [
        {
          name: "Broken",
          categorySlug: "missing",
          websiteUrl: "not-a-url"
        }
      ],
      categories,
      {
        dryRun: false,
        allowWrite: true
      },
    );

    expect(plan.canWrite).toBe(false);
    expect(plan.invalidRows[0]?.errors).toContain("Unknown categorySlug: missing.");
    expect(plan.invalidRows[0]?.errors).toContain("websiteUrl must be a valid URL.");
  });

  it("parses array and object JSON import files", () => {
    expect(parseCatalogImportJson('[{"name":"One"}]')).toHaveLength(1);
    expect(parseCatalogImportJson('{"apps":[{"name":"Two"}]}')).toHaveLength(1);
    expect(() => parseCatalogImportJson('{"items":[]}')).toThrow("apps array");
  });
});
