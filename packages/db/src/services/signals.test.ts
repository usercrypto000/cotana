import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    app: {
      findMany: vi.fn()
    },
    appSignalSnapshot: {
      createMany: vi.fn(),
      findMany: vi.fn()
    }
  }
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

import { listAppSignalSnapshots, storeWeeklySignalSnapshots } from "./signals";

describe("signal snapshot services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the latest numeric signal for each metric once per app", async () => {
    mocks.prisma.app.findMany.mockResolvedValue([
      {
        id: "app-1",
        category: { slug: "defi" },
        signals: [
          { signalKey: "tvl", numericValue: 120, observedAt: new Date("2026-03-20T00:00:00.000Z") },
          { signalKey: "tvl", numericValue: 100, observedAt: new Date("2026-03-10T00:00:00.000Z") },
          { signalKey: "volume", numericValue: 25, observedAt: new Date("2026-03-19T00:00:00.000Z") }
        ]
      }
    ]);
    mocks.prisma.appSignalSnapshot.createMany.mockResolvedValue({ count: 2 });

    const stored = await storeWeeklySignalSnapshots(new Date("2026-03-31T00:00:00.000Z"));

    expect(stored).toBe(2);
    expect(mocks.prisma.appSignalSnapshot.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ appId: "app-1", metric: "tvl", numericValue: 120 }),
        expect.objectContaining({ appId: "app-1", metric: "volume", numericValue: 25 })
      ]
    });
  });

  it("queries app signal history with metric filtering", async () => {
    mocks.prisma.appSignalSnapshot.findMany.mockResolvedValue([]);

    await listAppSignalSnapshots("app-1", {
      metric: "tvl",
      limit: 12
    });

    expect(mocks.prisma.appSignalSnapshot.findMany).toHaveBeenCalledWith({
      where: {
        appId: "app-1",
        metric: "tvl"
      },
      orderBy: {
        observedAt: "desc"
      },
      take: 12
    });
  });
});
