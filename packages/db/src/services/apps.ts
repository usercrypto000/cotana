import {
  AppStatus,
  Prisma,
  ReviewStatus
} from "@prisma/client";
import type { AppSummary, AppTrustMetadata } from "@cotana/types";
import { normalizeTrustMetadata } from "@cotana/types";
import { incrementCounter } from "../redis";
import { prisma } from "../client";

type ReviewStats = {
  rating: number;
  reviewCount: number;
};

type LikeStats = {
  likeCount: number;
};

export type CategoryRecord = Prisma.CategoryGetPayload<Record<string, never>>;

export type AdminAppInput = {
  slug?: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  verifiedNote?: string | null;
  trustMetadata?: Partial<AppTrustMetadata> | null;
  categoryId: string;
  tags: string[];
  screenshots: string[];
};

export type AdminAppRecord = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  verifiedNote: string | null;
  trustMetadata: AppTrustMetadata;
  isCommunityPick: boolean;
  status: AppStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  category: {
    id: string;
    slug: string;
    name: string;
  };
  tags: string[];
  screenshots: {
    id: string;
    imageUrl: string;
    sortOrder: number;
  }[];

  rating: number;
  reviewCount: number;
  likeCount: number;
};

export type AppDetailRecord = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  trustMetadata: AppTrustMetadata;
  isCommunityPick: boolean;
  createdAt: Date;
  publishedAt: Date | null;
  category: {
    id: string;
    slug: string;
    name: string;
  };
  tags: string[];
  screenshots: {
    id: string;
    imageUrl: string;
    sortOrder: number;
  }[];

  rating: number;
  reviewCount: number;
  likeCount: number;
  likedByCurrentUser: boolean;
  savedByCurrentUser: boolean;
  reviews: {
    id: string;
    rating: number;
    body: string;
    createdAt: Date;
    user: {
      displayName: string | null;
      avatarUrl: string | null;
    };
  }[];
};

type PublishedAppInclude = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  websiteUrl: string;
  logoUrl: string;
  verified: boolean;
  verificationStatus?: AppTrustMetadata["verificationStatus"] | null;
  publisherName?: string | null;
  publisherType?: AppTrustMetadata["publisherType"] | null;
  supportedChains?: string[] | null;
  permissionScopes?: string[] | null;
  paymentCapabilities?: string[] | null;
  custodyModel?: string | null;
  externalRiskNotes?: string | null;
  lastReviewedAt?: Date | null;
  reviewSummary?: string | null;
  isCommunityPick: boolean;
  createdAt: Date;
  publishedAt: Date | null;
  category: {
    id: string;
    slug: string;
    name: string;
    sortOrder: number;
  };
  tags: {
    tag: string;
  }[];
  screenshots: {
    id: string;
    imageUrl: string;
    sortOrder: number;
  }[];
  reviews: {
    id: string;
    rating: number;
    body: string;
    createdAt: Date;
    user: {
      displayName: string | null;
      avatarUrl: string | null;
    };
  }[];
  likes: {
    id: string;
  }[] | false;
  libraryItems: {
    id: string;
  }[] | false;
};

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTags(tags: string[]) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function normalizeScreenshots(screenshots: string[]) {
  return [...new Set(screenshots.map((url) => url.trim()).filter(Boolean))];
}



function toTrustMetadata(app: {
  verified?: boolean;
  verificationStatus?: AppTrustMetadata["verificationStatus"] | null;
  publisherName?: string | null;
  publisherType?: AppTrustMetadata["publisherType"] | null;
  supportedChains?: string[] | null;
  permissionScopes?: string[] | null;
  paymentCapabilities?: string[] | null;
  custodyModel?: string | null;
  externalRiskNotes?: string | null;
  lastReviewedAt?: Date | null;
  reviewSummary?: string | null;
}) {
  return normalizeTrustMetadata(
    {
      verificationStatus: app.verificationStatus ?? undefined,
      publisherName: app.publisherName ?? undefined,
      publisherType: app.publisherType ?? undefined,
      supportedChains: app.supportedChains ?? undefined,
      permissionScopes: app.permissionScopes ?? undefined,
      paymentCapabilities: app.paymentCapabilities ?? undefined,
      custodyModel: app.custodyModel ?? undefined,
      externalRiskNotes: app.externalRiskNotes ?? undefined,
      lastReviewedAt: app.lastReviewedAt ?? undefined,
      reviewSummary: app.reviewSummary ?? undefined
    },
    {
      verified: app.verified,
      lastReviewedAt: app.lastReviewedAt
    },
  );
}

async function getReviewStats(appIds: string[]) {
  if (appIds.length === 0) {
    return new Map<string, ReviewStats>();
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
    return new Map<string, LikeStats>();
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

  return new Map(
    stats.map((row) => [
      row.appId,
      {
        likeCount: row._count._all
      }
    ]),
  );
}

function toSummary(
  app: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string;
    verified: boolean;
    verificationStatus?: AppTrustMetadata["verificationStatus"] | null;
    publisherName?: string | null;
    publisherType?: AppTrustMetadata["publisherType"] | null;
    supportedChains?: string[] | null;
    permissionScopes?: string[] | null;
    paymentCapabilities?: string[] | null;
    custodyModel?: string | null;
    externalRiskNotes?: string | null;
    lastReviewedAt?: Date | null;
    reviewSummary?: string | null;
    isCommunityPick: boolean;
    shortDescription: string;
    longDescription: string;
    publishedAt: Date | null;
    category: {
      slug: string;
      name: string;
      sortOrder: number;
    };
  },
  reviewStats: ReviewStats | undefined,
  likeStats: LikeStats | undefined,
): AppSummary {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    logoUrl: app.logoUrl,
    verified: app.verified,
    isCommunityPick: app.isCommunityPick,
    shortDescription: app.shortDescription,
    longDescription: app.longDescription,
    publishedAt: app.publishedAt,
    category: app.category,
    rating: reviewStats?.rating ?? 0,
    reviewCount: reviewStats?.reviewCount ?? 0,
    likeCount: likeStats?.likeCount ?? 0,
    trustMetadata: toTrustMetadata(app)
  };
}

async function enrichAdminApps(
  apps: Array<{
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    websiteUrl: string;
    logoUrl: string;
    verified: boolean;
    verifiedNote: string | null;
    verificationStatus?: AppTrustMetadata["verificationStatus"] | null;
    publisherName?: string | null;
    publisherType?: AppTrustMetadata["publisherType"] | null;
    supportedChains?: string[] | null;
    permissionScopes?: string[] | null;
    paymentCapabilities?: string[] | null;
    custodyModel?: string | null;
    externalRiskNotes?: string | null;
    lastReviewedAt?: Date | null;
    reviewSummary?: string | null;
    isCommunityPick: boolean;
    status: AppStatus;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
    category: {
      id: string;
      slug: string;
      name: string;
    };
    tags: {
      tag: string;
    }[];
    screenshots: {
      id: string;
      imageUrl: string;
      sortOrder: number;
    }[];

  }>,
) {
  const appIds = apps.map((app) => app.id);
  const reviewStats = await getReviewStats(appIds);
  const likeStats = await getLikeStats(appIds);

  return apps.map<AdminAppRecord>((app) => ({
    id: app.id,
    slug: app.slug,
    name: app.name,
    shortDescription: app.shortDescription,
    longDescription: app.longDescription,
    websiteUrl: app.websiteUrl,
    logoUrl: app.logoUrl,
    verified: app.verified,
    verifiedNote: app.verifiedNote,
    trustMetadata: toTrustMetadata(app),
    isCommunityPick: app.isCommunityPick,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    publishedAt: app.publishedAt,
    category: app.category,
    tags: app.tags.map((tag) => tag.tag),
    screenshots: app.screenshots,
    rating: reviewStats.get(app.id)?.rating ?? 0,
    reviewCount: reviewStats.get(app.id)?.reviewCount ?? 0,
    likeCount: likeStats.get(app.id)?.likeCount ?? 0
  }));
}

export async function listCategories(): Promise<CategoryRecord[]> {
  return prisma.category.findMany({
    orderBy: {
      sortOrder: "asc"
    }
  });
}

export async function listAdminApps() {
  const apps = await prisma.app.findMany({
    include: {
      category: true,
      tags: {
        orderBy: {
          tag: "asc"
        }
      },
      screenshots: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  return enrichAdminApps(apps);
}

export async function getAdminAppById(id: string) {
  const app = await prisma.app.findUnique({
    where: { id },
    include: {
      category: true,
      tags: {
        orderBy: {
          tag: "asc"
        }
      },
      screenshots: {
        orderBy: {
          sortOrder: "asc"
        }
      }
    }
  });

  if (!app) {
    return null;
  }

  const [record] = await enrichAdminApps([app]);
  return record ?? null;
}

async function replaceTagsAndScreenshots(appId: string, input: AdminAppInput) {
  const tags = normalizeTags(input.tags);
  const screenshots = normalizeScreenshots(input.screenshots);

  await prisma.appTag.deleteMany({
    where: { appId }
  });

  await prisma.appScreenshot.deleteMany({
    where: { appId }
  });

  if (tags.length > 0) {
    await prisma.appTag.createMany({
      data: tags.map((tag) => ({
        appId,
        tag
      }))
    });
  }

  if (screenshots.length > 0) {
    await prisma.appScreenshot.createMany({
      data: screenshots.map((imageUrl, index) => ({
        appId,
        imageUrl,
        sortOrder: index
      }))
    });
  }
}
function trustMetadataData(input: AdminAppInput) {
  return {
    verificationStatus: input.trustMetadata?.verificationStatus ?? (input.verified ? "verified" : "unreviewed"),
    publisherName: input.trustMetadata?.publisherName?.trim() || null,
    publisherType: input.trustMetadata?.publisherType ?? "unknown",
    supportedChains: input.trustMetadata?.supportedChains ?? [],
    permissionScopes: input.trustMetadata?.permissionScopes ?? [],
    paymentCapabilities: input.trustMetadata?.paymentCapabilities ?? [],
    custodyModel: input.trustMetadata?.custodyModel?.trim() || null,
    externalRiskNotes: input.trustMetadata?.externalRiskNotes?.trim() || null,
    lastReviewedAt: input.trustMetadata?.lastReviewedAt ?? null,
    reviewSummary: input.trustMetadata?.reviewSummary?.trim() || null
  };
}

export async function createAdminApp(input: AdminAppInput, createdByUserId: string) {
  const app = await prisma.app.create({
    data: {
      slug: input.slug?.trim() ? slugify(input.slug) : slugify(input.name),
      name: input.name.trim(),
      shortDescription: input.shortDescription.trim(),
      longDescription: input.longDescription.trim(),
      websiteUrl: input.websiteUrl.trim(),
      logoUrl: input.logoUrl.trim(),
      verified: input.verified,
      verifiedNote: input.verifiedNote?.trim() || null,
      categoryId: input.categoryId,
      createdByUserId
    }
  });

  await replaceTagsAndScreenshots(app.id, input);
  return getAdminAppById(app.id);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateAdminApp(id: string, input: AdminAppInput, _updatedByUserId?: string | null) {
  const previous = await prisma.app.findUnique({
    where: {
      id
    }
  });

  if (!previous) {
    return null;
  }

  try {
    await prisma.app.update({
      where: { id },
      data: {
        slug: input.slug?.trim() ? slugify(input.slug) : slugify(input.name),
        name: input.name.trim(),
        shortDescription: input.shortDescription.trim(),
        longDescription: input.longDescription.trim(),
        websiteUrl: input.websiteUrl.trim(),
        logoUrl: input.logoUrl.trim(),
        verified: input.verified,
        verifiedNote: input.verifiedNote?.trim() || null,
        ...trustMetadataData(input),
        categoryId: input.categoryId
      }
    });
  } catch {
    return null;
  }

  await replaceTagsAndScreenshots(id, input);
  return getAdminAppById(id);
}

export async function setAdminAppStatus(id: string, status: AppStatus) {
  try {
    await prisma.app.update({
      where: { id },
      data: {
        status,
        publishedAt: status === AppStatus.PUBLISHED ? new Date() : null
      }
    });
  } catch {
    return null;
  }

  return getAdminAppById(id);
}

export async function listPublishedApps(categorySlug?: string): Promise<AppSummary[]> {
  const apps = await prisma.app.findMany({
    where: {
      status: AppStatus.PUBLISHED,
      ...(categorySlug && categorySlug !== "all"
        ? {
            category: {
              slug: categorySlug
            }
          }
        : {})
    },
    include: {
      category: true
    },
    orderBy: [
      {
        publishedAt: "desc"
      },
      {
        createdAt: "desc"
      }
    ]
  });

  const appIds = apps.map((app) => app.id);
  const reviewStats = await getReviewStats(appIds);
  const likeStats = await getLikeStats(appIds);

  return apps.map((app) => toSummary(app, reviewStats.get(app.id), likeStats.get(app.id)));
}

export async function searchAppsByHumanIntent(embedding: number[]) {
  const vectorString = `[${embedding.map((value) => Number(value.toFixed(8))).join(",")}]`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT 
      a.id,
      a.name,
      a."shortDescription",
      a."longDescription",
      a."isCommunityPick",
      a."logoUrl",
      a.slug,
      a.verified,
      c.slug as "categorySlug",
      c.name as "categoryName",
      1 - (ae.embedding <=> $1::vector) as similarity
    FROM "App" a
    JOIN "AppEmbedding" ae ON a.id = ae."appId"
    JOIN "Category" c ON a."categoryId" = c.id
    WHERE a.status = 'PUBLISHED'
    ORDER BY ae.embedding <=> $1::vector ASC
    LIMIT 10;
    `,
    vectorString
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    isCommunityPick: row.isCommunityPick,
    logoUrl: row.logoUrl,
    slug: row.slug,
    verified: row.verified,
    similarity: row.similarity,
    category: {
      slug: row.categorySlug,
      name: row.categoryName
    }
  }));
}

function toAppDetailRecord(
  app: PublishedAppInclude,
  reviewStats: ReviewStats | undefined,
  likeStats: LikeStats | undefined,
) {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    shortDescription: app.shortDescription,
    longDescription: app.longDescription,
    websiteUrl: app.websiteUrl,
    logoUrl: app.logoUrl,
    verified: app.verified,
    trustMetadata: toTrustMetadata(app),
    isCommunityPick: app.isCommunityPick,
    createdAt: app.createdAt,
    publishedAt: app.publishedAt,
    category: app.category,
    tags: app.tags.map((tag) => tag.tag),
    screenshots: app.screenshots,
    rating: reviewStats?.rating ?? 0,
    reviewCount: reviewStats?.reviewCount ?? 0,
    likeCount: likeStats?.likeCount ?? 0,
    likedByCurrentUser: Array.isArray(app.likes) ? app.likes.length > 0 : false,
    savedByCurrentUser: Array.isArray(app.libraryItems) ? app.libraryItems.length > 0 : false,
    reviews: app.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
      user: review.user
    }))
  } satisfies AppDetailRecord;
}

async function getPublishedApp(
  where: { id?: string; slug?: string },
  currentUserId?: string | null,
): Promise<AppDetailRecord | null> {
  const app = await prisma.app.findFirst({
    where: {
      ...where,
      status: AppStatus.PUBLISHED
    },
    include: {
      category: true,
      tags: {
        orderBy: {
          tag: "asc"
        }
      },
      screenshots: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      reviews: {
        where: {
          status: {
            in: [ReviewStatus.PUBLISHED, ReviewStatus.FLAGGED]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              displayName: true,
              avatarUrl: true
            }
          }
        }
      },
      likes: currentUserId
        ? {
            where: {
              userId: currentUserId
            },
            select: {
              id: true
            }
          }
        : false,
      libraryItems: currentUserId
        ? {
            where: {
              userId: currentUserId
            },
            select: {
              id: true
            }
          }
        : false
    }
  });

  if (!app) {
    return null;
  }

  const reviewStats = await getReviewStats([app.id]);
  const likeStats = await getLikeStats([app.id]);

  return toAppDetailRecord(app, reviewStats.get(app.id), likeStats.get(app.id));
}

export async function getPublishedAppBySlug(slug: string, currentUserId?: string | null): Promise<AppDetailRecord | null> {
  return getPublishedApp({ slug }, currentUserId);
}

export async function getPublishedAppById(id: string, currentUserId?: string | null): Promise<AppDetailRecord | null> {
  return getPublishedApp({ id }, currentUserId);
}

export async function listLibraryApps(userId: string): Promise<AppSummary[]> {
  const libraryItems = await prisma.appLibraryItem.findMany({
    where: {
      userId,
      app: {
        status: AppStatus.PUBLISHED
      }
    },
    include: {
      app: {
        include: {
          category: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const apps = libraryItems.map((item) => item.app);
  const reviewStats = await getReviewStats(apps.map((app) => app.id));
  const likeStats = await getLikeStats(apps.map((app) => app.id));

  return apps.map((app) => toSummary(app, reviewStats.get(app.id), likeStats.get(app.id)));
}

export async function toggleAppLike(appId: string, userId: string, liked: boolean) {
  if (liked) {
    await prisma.appLike.upsert({
      where: {
        appId_userId: {
          appId,
          userId
        }
      },
      update: {},
      create: {
        appId,
        userId
      }
    });
  } else {
    await prisma.appLike.deleteMany({
      where: {
        appId,
        userId
      }
    });
  }

  return getLikeStats([appId]).then((stats) => stats.get(appId)?.likeCount ?? 0);
}

export async function toggleLibraryItem(appId: string, userId: string, saved: boolean) {
  if (saved) {
    await prisma.appLibraryItem.upsert({
      where: {
        appId_userId: {
          appId,
          userId
        }
      },
      update: {},
      create: {
        appId,
        userId
      }
    });
  } else {
    await prisma.appLibraryItem.deleteMany({
      where: {
        appId,
        userId
      }
    });
  }
}

export async function trackAppView(appId: string, userId?: string | null, sessionId?: string | null) {
  const view = await prisma.appView.create({
    data: {
      appId,
      userId: userId ?? null,
      sessionId: sessionId ?? null
    }
  });

  await incrementCounter(`page-velocity:${appId}`, 60 * 60 * 24 * 7);
  return view;
}
