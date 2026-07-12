import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLaunchHealth: vi.fn()
}));

vi.mock("@cotana/db", () => ({
  getLaunchHealth: mocks.getLaunchHealth,
  getLaunchHealthHttpStatus: (status: string) => (status === "ok" || status === "ok_with_warnings" ? 200 : 503)
}));

import { GET } from "./route";

describe("store health route", () => {
  it("returns public-safe health payload shape", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-store",
      environment: "test",
      build: { version: "0.1.0", commitHash: null },
      databaseReachable: true,
      redisReachable: true,
      authConfigPresent: false,
      analyticsConfigPresent: false,
      registryVersion: "2026-05-17",
      timestamp: "2026-05-17T00:00:00.000Z",
      status: "ok"
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      app: "cotana-store",
      databaseReachable: true,
      registryVersion: "2026-05-17"
    });
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  });

  it("returns 200 for preview health warnings", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-store",
      status: "ok_with_warnings",
      warnings: [{ id: "redis", message: "Preview Redis warning." }]
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok_with_warnings");
  });
});
