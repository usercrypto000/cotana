import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLaunchHealth: vi.fn(),
  getSessionUser: vi.fn()
}));

vi.mock("@cotana/auth/authorization", () => ({
  isAdminUser: (user: { role?: string } | null) => user?.role === "ADMIN"
}));

vi.mock("@cotana/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@cotana/config")>()),
  validateRuntimeEnvironment: () => ({
    status: "pass",
    environment: "test",
    localFallbacks: [],
    checks: []
  })
}));

vi.mock("@cotana/db", () => ({
  getLaunchHealth: mocks.getLaunchHealth
}));

vi.mock("../../../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

import { GET } from "./route";

describe("admin environment health route", () => {
  it("requires admin authorization", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    expect((await GET()).status).toBe(403);
  });

  it("returns detailed environment diagnostics to admins", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "ADMIN" });
    mocks.getLaunchHealth.mockResolvedValue({ app: "cotana-admin", status: "ok" });

    const body = await (await GET()).json();

    expect(body).toMatchObject({
      purpose: "admin_environment_health",
      validation: {
        status: "pass"
      },
      health: {
        app: "cotana-admin"
      }
    });
  });
});
