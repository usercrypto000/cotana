import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCatalogCoverageAudit: vi.fn(),
  getSessionUser: vi.fn()
}));

vi.mock("@cotana/auth/authorization", () => ({
  isAdminUser: (user: { role?: string } | null) => user?.role === "ADMIN"
}));

vi.mock("@cotana/db", () => ({
  getCatalogCoverageAudit: mocks.getCatalogCoverageAudit
}));

vi.mock("../../../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

import { GET } from "./route";

describe("admin catalog coverage route", () => {
  it("requires admin access", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "USER" });

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it("returns the internal catalog coverage audit", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "ADMIN" });
    mocks.getCatalogCoverageAudit.mockResolvedValue({
      generatedAt: new Date("2026-05-17T00:00:00.000Z"),
      humanCategories: [],
      agentCategories: [],
      capabilityTypes: [],
      warnings: []
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      purpose: "internal_catalog_qa",
      noExecution: true,
      audit: {
        warnings: []
      }
    });
  });
});
