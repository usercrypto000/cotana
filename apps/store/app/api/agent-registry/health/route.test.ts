import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLaunchHealth: vi.fn()
}));

vi.mock("@cotana/db", () => ({
  getLaunchHealth: mocks.getLaunchHealth,
  getLaunchHealthHttpStatus: (status: string) => (status === "ok" || status === "ok_with_warnings" ? 200 : 503)
}));

import { GET } from "./route";

describe("registry health route", () => {
  it("includes registry version metadata", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-registry",
      environment: "test",
      build: { version: "0.1.0", commitHash: null },
      databaseReachable: true,
      redisReachable: false,
      authConfigPresent: false,
      analyticsConfigPresent: false,
      registryVersion: "2026-05-17",
      timestamp: "2026-05-17T00:00:00.000Z",
      status: "ok"
    });

    const body = await (await GET()).json();

    expect(body).toMatchObject({
      purpose: "registry_health",
      schemaVersion: "2026-05-17",
      registryVersion: "2026-05-17",
      discoveryOnly: {
        cotanaRole: "DISCOVERY_ONLY"
      }
    });
  });

  it("keeps registry preview warnings on a 200 response", async () => {
    mocks.getLaunchHealth.mockResolvedValue({
      app: "cotana-registry",
      environment: "production",
      deploymentEnvironment: "preview",
      databaseReachable: true,
      redisReachable: false,
      registryVersion: "2026-05-17",
      timestamp: "2026-05-17T00:00:00.000Z",
      warnings: [{ id: "redis" }],
      status: "ok_with_warnings"
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok_with_warnings");
  });
});
