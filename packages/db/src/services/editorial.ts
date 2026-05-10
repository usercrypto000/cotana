import { AppStatus, EditorialShelfStatus, EditorialShelfVisibility, ReviewStatus } from "@prisma/client";
import type { AppSummary } from "@cotana/types";
import { deleteCacheValue, getCacheValue, setCacheValue } from "../redis";
import { prisma } from "../client";

export type EditorialShelfInput = {
  title: string;
  slug?: string;
  description: string;
  status: EditorialShelfStatus;
  sortOrder: number;
  visibility: EditorialShelfVisibility;
  pinned: boolean;
  categoryId?: string | null;
  appIds: string[];
};

export type EditorialShelfRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: EditorialShelfStatus;
  sortOrder: number;
  visibility: EditorialShelfVisibility;
  pinned: boolean;
  publishedAt: Date | null;
  category: {
    id: string;
    slug: string;
    name: string;
  } | null;
  itemCount: number;
  items: Array<{
    id: string;
    sortOrder: number;
    app: {
      id: string;
      slug: string;
      name: string;
      shortDescription: string;
      longDescription: string;
      logoUrl: string;
      verified: boolean;
      agentAudience: "HUMAN" | "AGENT" | "HYBRID";
      communityPick: boolean;
      publishedAt: Date | null;
      status: AppStatus;
      category: {
        id: string;
        slug: string;
        name: string;
      };
    };
  }>;
};

export type PublicEditorialShelf = {
  id: string;
  title: string;
  slug: string;
  description: string;
  pinned: boolean;
  visibility: EditorialShelfVisibility;
  category: {
    id: string;
    slug: string;
    name: string;
  } | null;
  items: AppSummary[];
};

type EditorialShelfWithRelations = Awaited<ReturnType<typeof prisma.editorialShelf.findFirst>> & {
  category: {
    id: string;
    slug: string;
    name: string;
  } | null;
  items: Array<{
    id: string;
    sortOrder: number;
    app: {
      id: string;
      slug: string;
      name: string;
      shortDescription: string;
      longDescription: string;
      logoUrl: string;
      verified: boolean;
      agentAudience: "HUMAN" | "AGENT" | "HYBRID";
      communityPick: boolean;
      publishedAt: Date | null;
      status: AppStatus;
      category: {
        id: string;
        slug: string;
        name: string;
        sortOrder: number;
      };
    };
  }>;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAppIds(appIds: string[]) {
  return [...new Set(appIds.map((appId) => appId.trim()).filter(Boolean))];
}

async function invalidateEditorialShelfCaches() {
  await deleteCacheValue("editorial-shelves:home");

  const categories = await prisma.category.findMany({
    select: {
      slug: true
    }
  });

  await Promise.all(
    categories.map((category) => deleteCacheValue(`editorial-shelves:category:${category.slug}`)),
  );
}

async function replaceShelfItems(shelfId: string, appIds: string[]) {
  const normalizedAppIds = normalizeAppIds(appIds);

  await prisma.editorialShelfItem.deleteMany({
    where: {
      shelfId
    }
  });

  if (normalizedAppIds.length === 0) {
    return;
  }

  await prisma.editorialShelfItem.createMany({
    data: normalizedAppIds.map((appId, index) => ({
      shelfId,
      appId,
      sortOrder: index
    }))
  });
}

async function getReviewStats(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, { rating: number; reviewCount: number }>();
  }

  const stats = await prisma.review.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: appIds
      },
      status: {
        in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
      }
    },
    _avg: {
      rating: true
    },
    _count: {
      _all: true
    }
  });

  return new Map(
    stats.map((row) => [
      row.appId,
      {
        rating: row._avg.rating ?? 0,
        reviewCount: row._count._all
      }
    ]),
  );
}

async function getLikeStats(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, number>();
  }

  const stats = await prisma.appLike.groupBy({
    by: ["appId"],
    where: {
      appId: {
        in: appIds
      }
    },
    _count: {
      _all: true
    }
  });

  return new Map(stats.map((row) => [row.appId, row._count._all]));
}

function toAppSummary(
  app: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string;
    verified: boolean;
    agentAudience: "HUMAN" | "AGENT" | "HYBRID";
    communityPick: boolean;
    shortDescription: string;
    longDescription: string;
    publishedAt: Date | null;
    category: {
      slug: string;
      name: string;
      sortOrder: number;
    };
  },
  reviewStats: { rating: number; reviewCount: number } | undefined,
  likeCount: number | undefined,
): AppSummary {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    logoUrl: app.logoUrl,
    verified: app.verified,
    agentAudience: app.agentAudience,
    communityPick: app.communityPick,
    shortDescription: app.shortDescription,
    longDescription: app.longDescription,
    publishedAt: app.publishedAt,
    category: app.category,
    rating: reviewStats?.rating ?? 0,
    reviewCount: reviewStats?.reviewCount ?? 0,
    likeCount: likeCount ?? 0
  };
}

function toEditorialShelfRecord(shelf: EditorialShelfWithRelations): EditorialShelfRecord {
  return {
    id: shelf.id,
    title: shelf.title,
    slug: shelf.slug,
    description: shelf.description,
    status: shelf.status,
    sortOrder: shelf.sortOrder,
    visibility: shelf.visibility,
    pinned: shelf.pinned,
    publishedAt: shelf.publishedAt,
    category: shelf.category,
    itemCount: shelf.items.length,
    items: shelf.items.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      app: {
        id: item.app.id,
        slug: item.app.slug,
        name: item.app.name,
        shortDescription: item.app.shortDescription,
        longDescription: item.app.longDescription,
        logoUrl: item.app.logoUrl,
        verified: item.app.verified,
        agentAudience: item.app.agentAudience,
        communityPick: item.app.communityPick,
        publishedAt: item.app.publishedAt,
        status: item.app.status,
        category: item.app.category
      }
    }))
  };
}

async function getEditorialShelfByWhere(where: { id?: string; slug?: string }) {
  const shelf = await prisma.editorialShelf.findFirst({
    where,
    include: {
      category: true,
      items: {
        orderBy: {
          sortOrder: "asc"
        },
        include: {
          app: {
            include: {
              category: true
            }
          }
        }
      }
    }
  });

  if (!shelf) {
    return null;
  }

  return toEditorialShelfRecord(shelf as EditorialShelfWithRelations);
}

export async function listAdminEditorialShelves() {
  const shelves = await prisma.editorialShelf.findMany({
    include: {
      category: true,
      items: {
        orderBy: {
          sortOrder: "asc"
        },
        include: {
          app: {
            include: {
              category: true
            }
          }
        }
      }
    },
    orderBy: [
      {
        pinned: "desc"
      },
      {
        sortOrder: "asc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });

  return shelves.map((shelf) => toEditorialShelfRecord(shelf as EditorialShelfWithRelations));
}

export async function getAdminEditorialShelfById(id: string) {
  return getEditorialShelfByWhere({ id });
}

export async function createEditorialShelf(input: EditorialShelfInput) {
  const shelf = await prisma.editorialShelf.create({
    data: {
      title: input.title.trim(),
      slug: input.slug?.trim() ? slugify(input.slug) : slugify(input.title),
      description: input.description.trim(),
      status: input.status,
      sortOrder: input.sortOrder,
      visibility: input.visibility,
      pinned: input.pinned,
      categoryId: input.categoryId ?? null,
      publishedAt: input.status === EditorialShelfStatus.PUBLISHED ? new Date() : null
    }
  });

  await replaceShelfItems(shelf.id, input.appIds);
  await invalidateEditorialShelfCaches();
  return getAdminEditorialShelfById(shelf.id);
}

export async function updateEditorialShelf(id: string, input: EditorialShelfInput) {
  try {
    await prisma.editorialShelf.update({
      where: {
        id
      },
      data: {
        title: input.title.trim(),
        slug: input.slug?.trim() ? slugify(input.slug) : slugify(input.title),
        description: input.description.trim(),
        status: input.status,
        sortOrder: input.sortOrder,
        visibility: input.visibility,
        pinned: input.pinned,
        categoryId: input.categoryId ?? null,
        publishedAt: input.status === EditorialShelfStatus.PUBLISHED ? new Date() : null
      }
    });
  } catch {
    return null;
  }

  await replaceShelfItems(id, input.appIds);
  await invalidateEditorialShelfCaches();
  return getAdminEditorialShelfById(id);
}

export async function listPublicEditorialShelves(input: { surface: "home" | "category"; categorySlug?: string }) {
  const cacheKey =
    input.surface === "home" ? "editorial-shelves:home" : `editorial-shelves:category:${input.categorySlug ?? "all"}`;
  const cached = await getCacheValue<PublicEditorialShelf[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const shelves = await prisma.editorialShelf.findMany({
    where: {
      status: EditorialShelfStatus.PUBLISHED,
      visibility:
        input.surface === "home"
          ? {
              in: [EditorialShelfVisibility.HOME, EditorialShelfVisibility.BOTH]
            }
          : {
              in: [EditorialShelfVisibility.CATEGORY, EditorialShelfVisibility.BOTH]
            },
      ...(input.surface === "home"
        ? {
            categoryId: null
          }
        : input.categorySlug && input.categorySlug !== "all"
          ? {
              OR: [
                {
                  category: {
                    slug: input.categorySlug
                  }
                },
                {
                  categoryId: null
                }
              ]
            }
          : {})
    },
    include: {
      category: true,
      items: {
        where: {
          app: {
            status: AppStatus.PUBLISHED
          }
        },
        orderBy: {
          sortOrder: "asc"
        },
        include: {
          app: {
            include: {
              category: true
            }
          }
        }
      }
    },
    orderBy: [
      {
        pinned: "desc"
      },
      {
        sortOrder: "asc"
      },
      {
        updatedAt: "desc"
      }
    ]
  });

  const appIds = shelves.flatMap((shelf) => shelf.items.map((item) => item.app.id));
  const reviewStats = await getReviewStats(appIds);
  const likeStats = await getLikeStats(appIds);

  const result = shelves
    .map<PublicEditorialShelf>((shelf) => ({
      id: shelf.id,
      title: shelf.title,
      slug: shelf.slug,
      description: shelf.description,
      pinned: shelf.pinned,
      visibility: shelf.visibility,
      category: shelf.category,
      items: shelf.items.map((item) =>
        toAppSummary(item.app, reviewStats.get(item.app.id), likeStats.get(item.app.id)),
      )
    }))
    .filter((shelf) => shelf.items.length > 0);

  await setCacheValue(cacheKey, result, 60 * 10);
  return result;
}
