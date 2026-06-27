import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLaunchChecklist: vi.fn(),
  getSessionUser: vi.fn()
}));

vi.mock("@cotana/auth/authorization", () => ({
  isAdminUser: (user: { role?: string } | null) => user?.role === "ADMIN"
}));

vi.mock("@cotana/db", () => ({
  getLaunchChecklist: mocks.getLaunchChecklist
}));

vi.mock("../../../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

import { GET } from "./route";

describe("admin launch checklist route", () => {
  it("is protected", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "USER" });

    await expect((await GET()).status).toBe(403);
  });

  it("returns launch checklist aggregation", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "ADMIN" });
    mocks.getLaunchChecklist.mockResolvedValue({
      status: "warning",
      generatedAt: "2026-05-17T00:00:00.000Z",
      items: [],
      summary: {
        failingIntentTests: 0
      }
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("warning");
    expect(body.summary.failingIntentTests).toBe(0);
  });
});
