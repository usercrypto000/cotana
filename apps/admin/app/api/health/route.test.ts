import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLaunchHealth: vi.fn()
}));

vi.mock("@cotana/db", () => ({
  getLaunchHealth: mocks.getLaunchHealth,
  getLaunchHealthHttpStatus: (status: string) => (status === "ok" || status === "ok_with_warnings" ? 200 : 503)
}));

import { GET } from "./route";

describe("admin health route", () => {
  it("returns safe admin health payload shape", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-admin",
      environment: "test",
      build: { version: "0.1.0", commitHash: null },
      databaseReachable: true,
      redisReachable: true,
      authConfigPresent: true,
      analyticsConfigPresent: false,
      registryVersion: "2026-05-17",
      timestamp: "2026-05-17T00:00:00.000Z",
      status: "ok"
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      app: "cotana-admin",
      databaseReachable: true,
      registryVersion: "2026-05-17"
    });
    expect(JSON.stringify(body)).not.toContain("PRIVY_APP_SECRET");
  });

  it("returns 503 for unhealthy admin dependencies when reachable", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-admin",
      status: "degraded"
    });

    const response = await GET();

    expect(response.status).toBe(503);
  });
});
