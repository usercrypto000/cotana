import {
  AgentAuthType,
  AgentCapabilityStatus,
  AgentInteractionMode,
  AgentInterfaceType,
  AgentListingStatus,
  AppAudience,
  AppStatus,
  Prisma,
  ReviewStatus
} from "@prisma/client";
import type { AgentCapabilitySummary, AppSummary, AppTrustMetadata } from "@cotana/types";
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
  agentAudience: AppAudience;
  agentListingStatus: AgentListingStatus;
  agentSummary?: string | null;
  agentDocsUrl?: string | null;
  agentIntegrationNotes?: string | null;
  categoryId: string;
  tags: string[];
  screenshots: string[];
  agentCapabilities: AgentCapabilityInput[];
};

export type AgentCapabilityInput = {
  name: string;
  slug?: string;
  description: string;
  capabilityType: string;
  authType: AgentAuthType;
  interfaceType: AgentInterfaceType;
  interactionMode: AgentInteractionMode;
  endpointUrl?: string | null;
  docsUrl?: string | null;
  inputSchemaJson?: unknown | null;
  outputSchemaJson?: unknown | null;
  safetyNotes?: string | null;
  status: AgentCapabilityStatus;
  reliabilityScore?: number | null;
  latencyP50Ms?: number | null;
  lastReviewedAt?: Date | string | null;
  deprecatedAt?: Date | string | null;
  deprecationReason?: string | null;
  replacementCapabilityId?: string | null;
  replacementDocsUrl?: string | null;
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
  agentAudience: AppAudience;
  agentListingStatus: AgentListingStatus;
  agentSummary: string | null;
  agentDocsUrl: string | null;
  agentIntegrationNotes: string | null;
  agentManifestVersion: number;
  agentLastReviewedAt: Date | null;
  communityPick: boolean;
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
  agentCapabilities: AgentCapabilitySummary[];
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
  agentAudience: AppAudience;
  agentListingStatus: AgentListingStatus;
  agentSummary: string | null;
  agentDocsUrl: string | null;
  agentManifestVersion: number;
  agentLastReviewedAt: Date | null;
  communityPick: boolean;
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
  agentCapabilities: AgentCapabilitySummary[];
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
  agentAudience: AppAudience;
  agentListingStatus: AgentListingStatus;
  agentSummary: string | null;
  agentDocsUrl: string | null;
  agentManifestVersion: number;
  agentLastReviewedAt: Date | null;
  communityPick: boolean;
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
  agentCapabilities: AgentCapabilitySummary[];
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

function normalizeAgentCapabilities(capabilities: AgentCapabilityInput[]) {
  const seen = new Set<string>();

  return capabilities
    .map((capability) => {
      const name = capability.name.trim();
      const slug = capability.slug?.trim() ? slugify(capability.slug) : slugify(name);
      const description = capability.description.trim();
      const capabilityType = capability.capabilityType.trim().toLowerCase();

      if (!name || !slug || !description || !capabilityType || seen.has(slug)) {
        return null;
      }

      seen.add(slug);

      return {
        name,
        slug,
        description,
        capabilityType,
        authType: capability.authType,
        interfaceType: capability.interfaceType,
        interactionMode: capability.interactionMode,
        endpointUrl: capability.endpointUrl?.trim() || null,
        docsUrl: capability.docsUrl?.trim() || null,
        inputSchemaJson: capability.inputSchemaJson ?? null,
        outputSchemaJson: capability.outputSchemaJson ?? null,
        safetyNotes: capability.safetyNotes?.trim() || null,
        status: capability.status,
        reliabilityScore: capability.reliabilityScore ?? null,
        latencyP50Ms: capability.latencyP50Ms ?? null,
        lastReviewedAt: capability.lastReviewedAt ? new Date(capability.lastReviewedAt) : null,
        deprecatedAt: capability.deprecatedAt ? new Date(capability.deprecatedAt) : null,
        deprecationReason: capability.deprecationReason?.trim() || null,
        replacementCapabilityId: capability.replacementCapabilityId?.trim() || null,
        replacementDocsUrl: capability.replacementDocsUrl?.trim() || null
      };
    })
    .filter((capability): capability is NonNullable<typeof capability> => Boolean(capability));
}

function toAgentCapabilitySummary(capability: AgentCapabilitySummary): AgentCapabilitySummary {
  return {
    id: capability.id,
    name: capability.name,
    slug: capability.slug,
    description: capability.description,
    capabilityType: capability.capabilityType,
    authType: capability.authType,
    interfaceType: capability.interfaceType,
    interactionMode: capability.interactionMode,
    endpointUrl: capability.endpointUrl,
    docsUrl: capability.docsUrl,
    inputSchemaJson: capability.inputSchemaJson,
    outputSchemaJson: capability.outputSchemaJson,
    safetyNotes: capability.safetyNotes,
    status: capability.status,
    reliabilityScore: capability.reliabilityScore,
    latencyP50Ms: capability.latencyP50Ms,
    manifestVersion: capability.manifestVersion,
    updatedAt: capability.updatedAt,
    lastReviewedAt: capability.lastReviewedAt,
    deprecatedAt: capability.deprecatedAt,
    deprecationReason: capability.deprecationReason,
    replacementCapabilityId: capability.replacementCapabilityId,
    replacementDocsUrl: capability.replacementDocsUrl
  };
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
  agentAudience?: AppAudience;
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
      lastReviewedAt: app.lastReviewedAt,
      agentAudience: app.agentAudience
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
    agentAudience: AppAudience;
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
  reviewStats: ReviewStats | undefined,
  likeStats: LikeStats | undefined,
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
    agentAudience: AppAudience;
    agentListingStatus: AgentListingStatus;
    agentSummary: string | null;
    agentDocsUrl: string | null;
    agentIntegrationNotes: string | null;
    agentManifestVersion: number;
    agentLastReviewedAt: Date | null;
    communityPick: boolean;
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
    agentCapabilities: AgentCapabilitySummary[];
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
    agentAudience: app.agentAudience,
    agentListingStatus: app.agentListingStatus,
    agentSummary: app.agentSummary,
    agentDocsUrl: app.agentDocsUrl,
    agentIntegrationNotes: app.agentIntegrationNotes,
    agentManifestVersion: app.agentManifestVersion,
    agentLastReviewedAt: app.agentLastReviewedAt,
    communityPick: app.communityPick,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    publishedAt: app.publishedAt,
    category: app.category,
    tags: app.tags.map((tag) => tag.tag),
    screenshots: app.screenshots,
    agentCapabilities: app.agentCapabilities.map(toAgentCapabilitySummary),
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
      },
      agentCapabilities: {
        orderBy: {
          name: "asc"
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
      },
      agentCapabilities: {
        orderBy: {
          name: "asc"
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

function toJsonValue(value: unknown) {
  return value === undefined ? Prisma.JsonNull : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
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

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

async function recordRegistryChange(input: {
  appId: string;
  capabilityId?: string | null;
  changeType: string;
  fieldName: string;
  previousValue: unknown;
  nextValue: unknown;
  createdByUserId?: string | null;
}) {
  if (valuesEqual(input.previousValue, input.nextValue)) {
    return;
  }

  await prisma.agentRegistryChangeLog.create({
    data: {
      appId: input.appId,
      capabilityId: input.capabilityId ?? null,
      changeType: input.changeType,
      fieldName: input.fieldName,
      previousValueJson: toJsonValue(input.previousValue),
      nextValueJson: toJsonValue(input.nextValue),
      createdByUserId: input.createdByUserId ?? null
    }
  });
}

async function replaceAgentCapabilities(appId: string, input: AdminAppInput, createdByUserId?: string | null) {
  const capabilities = normalizeAgentCapabilities(input.agentCapabilities);
  const existingCapabilities = await prisma.agentCapability.findMany({
    where: {
      appId
    }
  });
  const existingBySlug = new Map(existingCapabilities.map((capability) => [capability.slug, capability]));
  const nextSlugs = new Set(capabilities.map((capability) => capability.slug));

  for (const capability of existingCapabilities) {
    if (!nextSlugs.has(capability.slug) && capability.status !== AgentCapabilityStatus.PAUSED) {
      await prisma.agentCapability.update({
        where: {
          id: capability.id
        },
        data: {
          status: AgentCapabilityStatus.PAUSED,
          manifestVersion: {
            increment: 1
          },
          lastReviewedAt: new Date()
        }
      });
      await recordRegistryChange({
        appId,
        capabilityId: capability.id,
        changeType: "capability_status_change",
        fieldName: "status",
        previousValue: capability.status,
        nextValue: AgentCapabilityStatus.PAUSED,
        createdByUserId
      });
    }
  }

  for (const capability of capabilities) {
    const existing = existingBySlug.get(capability.slug);
    const data = {
      name: capability.name,
      slug: capability.slug,
      description: capability.description,
      capabilityType: capability.capabilityType,
      authType: capability.authType,
      interfaceType: capability.interfaceType,
      interactionMode: capability.interactionMode,
      endpointUrl: capability.endpointUrl,
      docsUrl: capability.docsUrl,
      inputSchemaJson:
        capability.inputSchemaJson === null ? Prisma.JsonNull : (capability.inputSchemaJson as Prisma.InputJsonValue),
      outputSchemaJson:
        capability.outputSchemaJson === null ? Prisma.JsonNull : (capability.outputSchemaJson as Prisma.InputJsonValue),
      safetyNotes: capability.safetyNotes,
      status: capability.status,
      reliabilityScore: capability.reliabilityScore,
      latencyP50Ms: capability.latencyP50Ms,
      lastReviewedAt: capability.lastReviewedAt ?? null,
      deprecatedAt:
        capability.status === AgentCapabilityStatus.DEPRECATED ? (capability.deprecatedAt ?? new Date()) : capability.deprecatedAt,
      deprecationReason: capability.deprecationReason,
      replacementCapabilityId: capability.replacementCapabilityId,
      replacementDocsUrl: capability.replacementDocsUrl
    };

    if (!existing) {
      const created = await prisma.agentCapability.create({
        data: {
          appId,
          ...data
        }
      });
      await recordRegistryChange({
        appId,
        capabilityId: created.id,
        changeType: "capability_status_change",
        fieldName: "created",
        previousValue: null,
        nextValue: capability.slug,
        createdByUserId
      });
      continue;
    }

    const sensitiveFields = [
      "status",
      "authType",
      "interfaceType",
      "interactionMode",
      "inputSchemaJson",
      "outputSchemaJson",
      "docsUrl",
      "safetyNotes",
      "reliabilityScore",
      "latencyP50Ms",
      "deprecatedAt",
      "deprecationReason",
      "replacementCapabilityId",
      "replacementDocsUrl"
    ] as const;
    const changed = sensitiveFields.some((field) => !valuesEqual(existing[field], data[field]));

    await prisma.agentCapability.update({
      where: {
        id: existing.id
      },
      data: {
        ...data,
        manifestVersion: changed
          ? {
              increment: 1
            }
          : undefined,
        lastReviewedAt: changed ? new Date() : data.lastReviewedAt
      }
    });

    for (const field of sensitiveFields) {
      await recordRegistryChange({
        appId,
        capabilityId: existing.id,
        changeType:
          field === "status"
            ? "capability_status_change"
            : field === "authType" || field === "interfaceType" || field === "interactionMode"
              ? "compatibility_change"
              : field === "inputSchemaJson" || field === "outputSchemaJson"
                ? "schema_change"
                : field === "docsUrl"
                  ? "docs_url_change"
                  : field === "safetyNotes"
                    ? "safety_notes_change"
                    : field === "reliabilityScore" || field === "latencyP50Ms"
                      ? "reliability_latency_change"
                      : "deprecation_change",
        fieldName: field,
        previousValue: existing[field],
        nextValue: data[field],
        createdByUserId
      });
    }
  }
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
      ...trustMetadataData(input),
      agentAudience: input.agentAudience,
      agentListingStatus: input.agentAudience === AppAudience.HUMAN ? AgentListingStatus.NOT_APPLICABLE : input.agentListingStatus,
      agentSummary: input.agentSummary?.trim() || null,
      agentDocsUrl: input.agentDocsUrl?.trim() || null,
      agentIntegrationNotes: input.agentIntegrationNotes?.trim() || null,
      agentLastReviewedAt: input.agentAudience === AppAudience.HUMAN ? null : new Date(),
      categoryId: input.categoryId,
      createdByUserId
    }
  });

  await replaceTagsAndScreenshots(app.id, input);
  await replaceAgentCapabilities(app.id, input, createdByUserId);
  return getAdminAppById(app.id);
}

export async function updateAdminApp(id: string, input: AdminAppInput, updatedByUserId?: string | null) {
  const previous = await prisma.app.findUnique({
    where: {
      id
    },
    include: {
      agentCapabilities: true
    }
  });

  if (!previous) {
    return null;
  }

  const nextAgentListingStatus =
    input.agentAudience === AppAudience.HUMAN ? AgentListingStatus.NOT_APPLICABLE : input.agentListingStatus;
  const registrySensitiveChanged =
    previous.agentAudience !== input.agentAudience ||
    previous.agentListingStatus !== nextAgentListingStatus ||
    previous.agentSummary !== (input.agentSummary?.trim() || null) ||
    previous.agentDocsUrl !== (input.agentDocsUrl?.trim() || null);

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
        agentAudience: input.agentAudience,
        agentListingStatus: nextAgentListingStatus,
        agentSummary: input.agentSummary?.trim() || null,
        agentDocsUrl: input.agentDocsUrl?.trim() || null,
        agentIntegrationNotes: input.agentIntegrationNotes?.trim() || null,
        agentManifestVersion: registrySensitiveChanged
          ? {
              increment: 1
            }
          : undefined,
        agentLastReviewedAt: registrySensitiveChanged ? new Date() : undefined,
        categoryId: input.categoryId
      }
    });
  } catch {
    return null;
  }

  await replaceTagsAndScreenshots(id, input);
  await Promise.all([
    recordRegistryChange({
      appId: id,
      changeType: "audience_change",
      fieldName: "agentAudience",
      previousValue: previous.agentAudience,
      nextValue: input.agentAudience,
      createdByUserId: updatedByUserId
    }),
    recordRegistryChange({
      appId: id,
      changeType: "registry_status_change",
      fieldName: "agentListingStatus",
      previousValue: previous.agentListingStatus,
      nextValue: nextAgentListingStatus,
      createdByUserId: updatedByUserId
    }),
    recordRegistryChange({
      appId: id,
      changeType: "docs_url_change",
      fieldName: "agentDocsUrl",
      previousValue: previous.agentDocsUrl,
      nextValue: input.agentDocsUrl?.trim() || null,
      createdByUserId: updatedByUserId
    })
  ]);
  await replaceAgentCapabilities(id, input, updatedByUserId);
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
    agentAudience: app.agentAudience,
    agentListingStatus: app.agentListingStatus,
    agentSummary: app.agentSummary,
    agentDocsUrl: app.agentDocsUrl,
    agentManifestVersion: app.agentManifestVersion,
    agentLastReviewedAt: app.agentLastReviewedAt,
    communityPick: app.communityPick,
    createdAt: app.createdAt,
    publishedAt: app.publishedAt,
    category: app.category,
    tags: app.tags.map((tag) => tag.tag),
    screenshots: app.screenshots,
    agentCapabilities:
      app.agentListingStatus === AgentListingStatus.PUBLISHED ? app.agentCapabilities.map(toAgentCapabilitySummary) : [],
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
      agentCapabilities: {
        where: {
          status: AgentCapabilityStatus.ACTIVE
        },
        orderBy: {
          name: "asc"
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
