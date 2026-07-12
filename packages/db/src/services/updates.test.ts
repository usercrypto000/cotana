import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    appUpdate: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

import { createAppUpdate, deleteAppUpdate, listAppUpdates, updateAppUpdate } from "./updates";

describe("app updates service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists updates newest first", async () => {
    mocks.prisma.appUpdate.findMany.mockResolvedValue([]);
    await listAppUpdates("app-1");

    expect(mocks.prisma.appUpdate.findMany).toHaveBeenCalledWith({
      where: { appId: "app-1" },
      orderBy: { publishedAt: "desc" }
    });
  });

  it("creates trimmed update entries", async () => {
    mocks.prisma.appUpdate.create.mockResolvedValue({ id: "u1" });

    await createAppUpdate("app-1", {
      versionLabel: " v1.0 ",
      title: " Launch ",
      body: " Great release ",
      publishedAt: new Date("2026-03-01T00:00:00.000Z"),
      type: "GENERAL"
    });

    expect(mocks.prisma.appUpdate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        appId: "app-1",
        versionLabel: "v1.0",
        title: "Launch",
        body: "Great release",
        type: "GENERAL"
      })
    });
  });

  it("returns null when an update cannot be changed", async () => {
    mocks.prisma.appUpdate.update.mockRejectedValue(new Error("missing"));

    const result = await updateAppUpdate("u1", {
      versionLabel: "v1.1",
      title: "Patch",
      body: "Body",
      publishedAt: new Date("2026-03-02T00:00:00.000Z"),
      type: "FIX"
    });

    expect(result).toBeNull();
  });

  it("returns false when a delete fails", async () => {
    mocks.prisma.appUpdate.delete.mockRejectedValue(new Error("missing"));

    await expect(deleteAppUpdate("u1")).resolves.toBe(false);
  });
});
