import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    editorialShelf: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn()
    },
    editorialShelfItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    category: {
      findMany: vi.fn()
    },
    review: {
      groupBy: vi.fn()
    },
    appLike: {
      groupBy: vi.fn()
    }
  },
  redis: {
    deleteCacheValue: vi.fn(),
    getCacheValue: vi.fn(),
    setCacheValue: vi.fn()
  }
}));

vi.mock("../client", () => ({
  prisma: mocks.prisma
}));

vi.mock("../redis", () => mocks.redis);

import { createEditorialShelf, updateEditorialShelf } from "./editorial";

describe("editorial shelf service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.category.findMany.mockResolvedValue([{ slug: "all" }, { slug: "defi" }]);
    mocks.prisma.review.groupBy.mockResolvedValue([]);
    mocks.prisma.appLike.groupBy.mockResolvedValue([]);
    mocks.prisma.editorialShelf.findFirst.mockResolvedValue({
      id: "s1",
      title: "Featured",
      slug: "featured",
      description: "Curated",
      status: "PUBLISHED",
      sortOrder: 0,
      visibility: "HOME",
      pinned: true,
      publishedAt: new Date("2026-03-01T00:00:00.000Z"),
      category: null,
      items: []
    });
  });

  it("creates a shelf, normalizes app ids, and invalidates caches", async () => {
    mocks.prisma.editorialShelf.create.mockResolvedValue({ id: "s1" });

    await createEditorialShelf({
      title: " Featured ",
      description: " Curated picks ",
      status: "PUBLISHED",
      sortOrder: 0,
      visibility: "HOME",
      pinned: true,
      categoryId: null,
      appIds: ["app-1", "app-1", " app-2 "]
    });

    expect(mocks.prisma.editorialShelf.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Featured",
        slug: "featured",
        description: "Curated picks",
        status: "PUBLISHED"
      })
    });
    expect(mocks.prisma.editorialShelfItem.createMany).toHaveBeenCalledWith({
      data: [
        { shelfId: "s1", appId: "app-1", sortOrder: 0 },
        { shelfId: "s1", appId: "app-2", sortOrder: 1 }
      ]
    });
    expect(mocks.redis.deleteCacheValue).toHaveBeenCalledWith("editorial-shelves:home");
  });

  it("returns null when an update targets a missing shelf", async () => {
    mocks.prisma.editorialShelf.update.mockRejectedValue(new Error("missing"));

    const result = await updateEditorialShelf("missing", {
      title: "Missing",
      description: "Missing",
      status: "DRAFT",
      sortOrder: 0,
      visibility: "HOME",
      pinned: false,
      categoryId: null,
      appIds: []
    });

    expect(result).toBeNull();
  });
});
