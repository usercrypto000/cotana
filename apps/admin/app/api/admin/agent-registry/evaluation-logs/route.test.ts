import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  isAdminUser: vi.fn(),
  listAgentRegistryEvaluationLogs: vi.fn()
}));

vi.mock("@cotana/auth/authorization", () => ({
  isAdminUser: mocks.isAdminUser
}));

vi.mock("@cotana/db", () => ({
  listAgentRegistryEvaluationLogs: mocks.listAgentRegistryEvaluationLogs
}));

vi.mock("../../../../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser
}));

import { GET } from "./route";

describe("admin registry evaluation log route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "admin" });
  });

  it("filters evaluation logs for registry QA", async () => {
    mocks.isAdminUser.mockReturnValue(true);
    mocks.listAgentRegistryEvaluationLogs.mockResolvedValue([{ id: "log-1" }]);

    const response = await GET(
      new NextRequest(
        "https://admin.cotana.test/api/admin/agent-registry/evaluation-logs?query=yield&category=lending-yield&capabilityType=comparison&authType=API_KEY&interfaceType=HTTP_API&interactionMode=READ_ONLY&readinessBucket=ready&matchedApp=harbor-yield&minBlockingIssueCount=1&from=2026-05-01&to=2026-05-17",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs).toEqual([{ id: "log-1" }]);
    expect(mocks.listAgentRegistryEvaluationLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "yield",
        categorySlug: "lending-yield",
        capabilityType: "comparison",
        authType: "API_KEY",
        interfaceType: "HTTP_API",
        interactionMode: "READ_ONLY",
        readinessBucket: "ready",
        matchedApp: "harbor-yield",
        minBlockingIssueCount: 1
      }),
    );
  });

  it("requires admin access", async () => {
    mocks.isAdminUser.mockReturnValue(false);

    const response = await GET(
      new NextRequest("https://admin.cotana.test/api/admin/agent-registry/evaluation-logs"),
    );

    expect(response.status).toBe(403);
  });
});
