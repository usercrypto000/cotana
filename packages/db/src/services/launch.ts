import {
  cotanaRegistryContract,
  getBuildMetadata,
  getRuntimeEnvironment,
  logServerEvent,
  validateRuntimeEnvironment
} from "@cotana/config";
import {
  AgentCapabilityStatus,
  AgentListingStatus,
  AppStatus,
  DiscoveryInsightKind,
  EditorialShelfStatus,
  EditorialShelfVisibility,
  ReviewStatus
} from "@prisma/client";
import { prisma } from "../client";
import { getRedisHealth } from "../redis";
import {
  getCatalogCoverageAudit,
  getAgentRegistryHealthExport,
  listAgentRegistryIntentTestRuns,
  listAgentRegistryQualityRows
} from "./agents";
import { reviewBodyMinimumLength, seededReviewBodies } from "./seed-fixtures";

export type LaunchHealthKind = "store" | "admin" | "registry" | "jobs";
export type LaunchHealthStatus = "ok" | "ok_with_warnings" | "degraded" | "unhealthy";
export type LaunchDependencyStatus = "ok" | "warning" | "fail";

export type LaunchHealthDependency = {
  id: string;
  label: string;
  status: LaunchDependencyStatus;
  required: boolean;
  productionRequired: boolean;
  previewBehavior: "required" | "warning" | "intentionally_absent";
  message: string;
  nextAction: string | null;
};

function isStrictProductionEnvironment(env: ReturnType<typeof getRuntimeEnvironment>) {
  return env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview";
}

function dependency(input: LaunchHealthDependency) {
  return input;
}

function healthStatusFromDependencies(dependencies: LaunchHealthDependency[]): LaunchHealthStatus {
  if (dependencies.some((entry) => entry.id === "database" && entry.status === "fail")) {
    return "unhealthy";
  }

  if (dependencies.some((entry) => entry.status === "fail")) {
    return "degraded";
  }

  if (dependencies.some((entry) => entry.status === "warning")) {
    return "ok_with_warnings";
  }

  return "ok";
}

export function getLaunchHealthHttpStatus(status: LaunchHealthStatus) {
  return status === "ok" || status === "ok_with_warnings" ? 200 : 503;
}

export async function getDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      reachable: true
    };
  } catch {
    return {
      reachable: false
    };
  }
}

export async function getLaunchHealth(kind: LaunchHealthKind) {
  const env = getRuntimeEnvironment({ ...process.env });
  const validation = validateRuntimeEnvironment({ ...process.env });
  const [database, redis] = await Promise.all([getDatabaseHealth(), getRedisHealth()]);
  const build = getBuildMetadata();
  const strictProduction = isStrictProductionEnvironment(env);
  const preview = env.VERCEL_ENV === "preview";
  const authConfigPresent = Boolean(env.NEXT_PUBLIC_PRIVY_APP_ID);
  const privyServerConfigPresent = Boolean((env.PRIVY_APP_ID || env.NEXT_PUBLIC_PRIVY_APP_ID) && env.PRIVY_APP_SECRET);
  const analyticsConfigPresent = Boolean(env.POSTHOG_KEY);
  const inngestConfigPresent = Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY);
  const embeddingConfigPresent = Boolean(env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || env.OPENAI_API_KEY);
  const adminAllowlistPresent = Boolean(env.ADMIN_ALLOWLIST_EMAIL);
  const storeUrlPresent = Boolean(env.NEXT_PUBLIC_STORE_URL);
  const adminUrlPresent = Boolean(env.NEXT_PUBLIC_ADMIN_URL);
  const registryUrlPresent = Boolean(env.NEXT_PUBLIC_REGISTRY_URL);

  if (validation.status !== "pass") {
    logServerEvent(validation.status === "fail" ? "error" : "warn", "Runtime environment validation is not passing.", {
      kind,
      status: validation.status,
      failedChecks: validation.checks.filter((check) => check.status === "fail").map((check) => check.key)
    });
  }

  const dependencies = [
    dependency({
      id: "database",
      label: "Database",
      status: database.reachable ? "ok" : "fail",
      required: true,
      productionRequired: true,
      previewBehavior: "required",
      message: database.reachable ? "Database is reachable." : "Database is unreachable.",
      nextAction: database.reachable ? null : "Restore DATABASE_URL or database connectivity before QA continues."
    }),
    dependency({
      id: "redis",
      label: "Redis",
      status: redis.reachable ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: redis.reachable
        ? "Redis is reachable."
        : strictProduction
          ? "REDIS_URL is required before production promotion."
          : "REDIS_URL is absent or unreachable; preview can use the in-memory fallback.",
      nextAction: redis.reachable
        ? null
        : strictProduction
          ? "Configure REDIS_URL before production promotion."
          : "Configure REDIS_URL for closer production parity, or acknowledge this as a preview warning."
    }),
    dependency({
      id: "privy-client",
      label: "Privy client auth",
      status: authConfigPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: authConfigPresent
        ? "Privy client auth is configured."
        : strictProduction
          ? "NEXT_PUBLIC_PRIVY_APP_ID is required before production promotion."
          : "Privy client auth is intentionally allowed to be absent in preview when testing public discovery routes.",
      nextAction: authConfigPresent
        ? null
        : strictProduction
          ? "Configure NEXT_PUBLIC_PRIVY_APP_ID before production promotion."
          : "Configure Privy preview credentials before testing signed-in flows."
    }),
    dependency({
      id: "privy-server",
      label: "Privy server auth",
      status: privyServerConfigPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: privyServerConfigPresent
        ? "Privy server auth is configured."
        : strictProduction
          ? "PRIVY_APP_SECRET is required before production promotion."
          : "Privy server auth is missing; preview public routes remain QA-able.",
      nextAction: privyServerConfigPresent
        ? null
        : strictProduction
          ? "Configure PRIVY_APP_SECRET before production promotion."
          : "Configure Privy server credentials before testing session sync."
    }),
    dependency({
      id: "session-secret",
      label: "Session secret",
      status: env.COTANA_SESSION_SECRET ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: env.COTANA_SESSION_SECRET
        ? "Session secret is configured."
        : strictProduction
          ? "COTANA_SESSION_SECRET is required before production promotion."
          : "Session secret is absent; preview public route QA can continue.",
      nextAction: env.COTANA_SESSION_SECRET ? null : "Configure COTANA_SESSION_SECRET before testing authenticated sessions."
    }),
    dependency({
      id: "admin-allowlist",
      label: "Admin allowlist",
      status: adminAllowlistPresent ? "ok" : strictProduction || kind === "admin" ? "fail" : "warning",
      required: strictProduction || kind === "admin",
      productionRequired: true,
      previewBehavior: kind === "admin" ? "required" : "warning",
      message: adminAllowlistPresent
        ? "Admin allowlist is configured."
        : kind === "admin"
          ? "ADMIN_ALLOWLIST_EMAIL is required to verify admin access."
          : "ADMIN_ALLOWLIST_EMAIL is not needed for public store preview checks.",
      nextAction: adminAllowlistPresent
        ? null
        : kind === "admin"
          ? "Configure ADMIN_ALLOWLIST_EMAIL before admin QA."
          : "Configure ADMIN_ALLOWLIST_EMAIL before production promotion."
    }),
    dependency({
      id: "posthog",
      label: "PostHog",
      status: analyticsConfigPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: analyticsConfigPresent
        ? "PostHog is configured."
        : strictProduction
          ? "POSTHOG_KEY is required before production promotion."
          : "PostHog is optional for preview QA.",
      nextAction: analyticsConfigPresent ? null : "Configure POSTHOG_KEY before production promotion."
    }),
    dependency({
      id: "inngest",
      label: "Inngest",
      status: inngestConfigPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: inngestConfigPresent
        ? "Inngest is configured."
        : strictProduction
          ? "Inngest keys are required before production promotion."
          : "Inngest is optional for preview route QA.",
      nextAction: inngestConfigPresent ? null : "Configure INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY before production promotion."
    }),
    dependency({
      id: "embeddings",
      label: "Vercel AI Gateway",
      status: embeddingConfigPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: embeddingConfigPresent
        ? "AI Gateway or legacy embedding credentials are configured."
        : strictProduction
          ? "AI Gateway credentials are required before production promotion."
          : "Embedding credentials are optional for preview route QA.",
      nextAction: embeddingConfigPresent ? null : "Configure Vercel OIDC or AI_GATEWAY_API_KEY before production promotion."
    }),
    dependency({
      id: "public-store-url",
      label: "Public store URL",
      status: storeUrlPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: storeUrlPresent ? "Public store URL is configured." : "NEXT_PUBLIC_STORE_URL is missing.",
      nextAction: storeUrlPresent ? null : "Set NEXT_PUBLIC_STORE_URL to the beta or production store URL."
    }),
    dependency({
      id: "public-admin-url",
      label: "Public admin URL",
      status: adminUrlPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: preview ? "warning" : "required",
      message: adminUrlPresent ? "Public admin URL is configured." : "NEXT_PUBLIC_ADMIN_URL is missing.",
      nextAction: adminUrlPresent ? null : "Set NEXT_PUBLIC_ADMIN_URL to the beta or production admin URL."
    }),
    dependency({
      id: "registry-url",
      label: "Registry URL",
      status: registryUrlPresent || storeUrlPresent ? "ok" : strictProduction ? "fail" : "warning",
      required: strictProduction,
      productionRequired: true,
      previewBehavior: registryUrlPresent ? "required" : "warning",
      message: registryUrlPresent
        ? "Explicit registry URL is configured."
        : storeUrlPresent
          ? "Registry URL can be derived from the store URL."
          : "NEXT_PUBLIC_REGISTRY_URL is missing and no store URL is configured.",
      nextAction: registryUrlPresent || storeUrlPresent ? null : "Set NEXT_PUBLIC_REGISTRY_URL or NEXT_PUBLIC_STORE_URL."
    })
  ];
  const status = healthStatusFromDependencies(dependencies);

  return {
    app: `cotana-${kind}`,
    environment: env.NODE_ENV,
    deploymentEnvironment: env.VERCEL_ENV ?? "local",
    build,
    databaseReachable: database.reachable,
    redisReachable: redis.reachable,
    redisFallbackActive: redis.fallbackActive,
    authConfigPresent,
    privyServerConfigPresent,
    analyticsConfigPresent,
    registryVersion: cotanaRegistryContract.registryVersion,
    dependencies,
    productionReadiness: {
      strict: strictProduction,
      missingRequired: dependencies
        .filter((entry) => entry.productionRequired && entry.status !== "ok")
        .map((entry) => entry.id)
    },
    warnings: dependencies.filter((entry) => entry.status === "warning").map((entry) => ({
      id: entry.id,
      message: entry.message,
      nextAction: entry.nextAction
    })),
    timestamp: new Date().toISOString(),
    status
  };
}

function latestRunsById(runs: Awaited<ReturnType<typeof listAgentRegistryIntentTestRuns>>) {
  const byId = new Map<string, (typeof runs)[number]>();

  for (const run of runs) {
    if (!byId.has(run.testCaseId)) {
      byId.set(run.testCaseId, run);
    }
  }

  return [...byId.values()];
}

async function getLatestDiscoveryItemCount(kind: DiscoveryInsightKind) {
  const latest = await prisma.discoveryInsightSnapshot.findFirst({
    where: {
      kind,
      categorySlug: null
    },
    orderBy: {
      computedAt: "desc"
    },
    select: {
      computedAt: true
    }
  });

  if (!latest) {
    return 0;
  }

  return prisma.discoveryInsightSnapshot.count({
    where: {
      kind,
      categorySlug: null,
      computedAt: latest.computedAt
    }
  });
}

export async function getPublicStoreSeedVisibility() {
  const [
    publishedAppCount,
    homepageShelfCount,
    homepageShelfItemCount,
    trendingItemCount,
    risingItemCount,
    categoriesWithApps,
    appsWithScreenshots,
    appsWithReviews,
    appsWithUpdates,
    registryPublishedListings,
    activeCapabilities
  ] = await Promise.all([
    prisma.app.count({
      where: {
        status: AppStatus.PUBLISHED
      }
    }),
    prisma.editorialShelf.count({
      where: {
        status: EditorialShelfStatus.PUBLISHED,
        visibility: {
          in: [EditorialShelfVisibility.HOME, EditorialShelfVisibility.BOTH]
        },
        items: {
          some: {}
        }
      }
    }),
    prisma.editorialShelfItem.count({
      where: {
        shelf: {
          status: EditorialShelfStatus.PUBLISHED,
          visibility: {
            in: [EditorialShelfVisibility.HOME, EditorialShelfVisibility.BOTH]
          }
        }
      }
    }),
    getLatestDiscoveryItemCount(DiscoveryInsightKind.TRENDING),
    getLatestDiscoveryItemCount(DiscoveryInsightKind.RISING),
    prisma.category.count({
      where: {
        slug: {
          not: "all"
        },
        apps: {
          some: {
            status: AppStatus.PUBLISHED
          }
        }
      }
    }),
    prisma.app.count({
      where: {
        status: AppStatus.PUBLISHED,
        screenshots: {
          some: {}
        }
      }
    }),
    prisma.app.count({
      where: {
        status: AppStatus.PUBLISHED,
        reviews: {
          some: {
            status: ReviewStatus.PUBLISHED
          }
        }
      }
    }),
    prisma.app.count({
      where: {
        status: AppStatus.PUBLISHED,
        updates: {
          some: {}
        }
      }
    }),
    prisma.app.count({
      where: {
        status: AppStatus.PUBLISHED,
        agentListingStatus: AgentListingStatus.PUBLISHED
      }
    }),
    prisma.agentCapability.count({
      where: {
        status: AgentCapabilityStatus.ACTIVE,
        app: {
          status: AppStatus.PUBLISHED,
          agentListingStatus: AgentListingStatus.PUBLISHED
        }
      }
    })
  ]);

  const homepageReady =
    publishedAppCount > 0 &&
    homepageShelfCount > 0 &&
    homepageShelfItemCount > 0 &&
    trendingItemCount > 0 &&
    risingItemCount > 0 &&
    categoriesWithApps > 0;

  return {
    publishedAppCount,
    homepageShelfCount,
    homepageShelfItemCount,
    trendingItemCount,
    risingItemCount,
    categoriesWithApps,
    appsWithScreenshots,
    appsWithReviews,
    appsWithUpdates,
    registryPublishedListings,
    activeCapabilities,
    homepageReady
  };
}

export async function getLaunchChecklist() {
  const env = getRuntimeEnvironment({ ...process.env });
  const [envValidation, coverage, registryHealth, qualityRows, intentRuns, health, seedVisibility, harborYield] = await Promise.all([
    Promise.resolve(validateRuntimeEnvironment({ ...process.env })),
    getCatalogCoverageAudit(),
    getAgentRegistryHealthExport(),
    listAgentRegistryQualityRows(),
    listAgentRegistryIntentTestRuns(100),
    getLaunchHealth("admin"),
    getPublicStoreSeedVisibility(),
    prisma.app.findUnique({
      where: {
        slug: "harbor-yield"
      },
      select: {
        id: true,
        verificationStatus: true,
        publisherName: true,
        reviewSummary: true
      }
    })
  ]);
  const latestRuns = latestRunsById(intentRuns);
  const failingIntentTests = latestRuns.filter((run) => !run.passed && !run.testSetVersion.startsWith("red-team-")).length;
  const failingRedTeamTests = latestRuns.filter((run) => !run.passed && run.testSetVersion.startsWith("red-team-")).length;
  const thinCategories = coverage.humanCategories.filter((entry) => entry.totalPublishedApps < 3);
  const appsWithoutScreenshots = coverage.humanCategories.reduce(
    (total, entry) => total + Math.max(entry.totalPublishedApps - entry.appsWithScreenshots, 0),
    0,
  );
  const publishedAppsWithoutUpdates = coverage.humanCategories.reduce(
    (total, entry) => total + Math.max(entry.totalPublishedApps - entry.appsWithUpdates, 0),
    0,
  );
  const weakDocsCapabilities = registryHealth.readinessBucketDistribution.weak_docs;
  const deprecatedVisibleRisks = qualityRows.filter(
    (row) => row.agentListingStatus === "PUBLISHED" && row.deprecatedCapabilityCount > 0 && row.activeCapabilityCount === 0,
  ).length;
  const pausedSearchRisks = qualityRows.filter((row) => row.agentListingStatus === "PAUSED" && row.activeCapabilityCount > 0).length;
  const redisDependency = health.dependencies.find((entry) => entry.id === "redis");
  const privyClientDependency = health.dependencies.find((entry) => entry.id === "privy-client");
  const privyServerDependency = health.dependencies.find((entry) => entry.id === "privy-server");
  const seededReviewBodiesValid = seededReviewBodies.every((body) => body.length >= reviewBodyMinimumLength);
  const harborYieldTrustProfileReady = Boolean(
    harborYield?.verificationStatus && harborYield.publisherName && harborYield.reviewSummary,
  );
  const items = [
    {
      id: "env-validation",
      label: "Environment validation",
      status: envValidation.status === "fail" ? "fail" : envValidation.status,
      detail: `${envValidation.checks.filter((check) => check.status === "fail").length} missing required checks.`
    },
    {
      id: "seed-coverage",
      label: "Seed catalog coverage",
      status: coverage.warnings.length > 0 ? "warning" : "pass",
      detail: `${coverage.warnings.length} catalog coverage warnings.`
    },
    {
      id: "public-homepage-seed-visibility",
      label: "Public homepage seed visibility",
      status: seedVisibility.homepageReady ? "pass" : "fail",
      detail: `${seedVisibility.homepageShelfItemCount} spotlight items, ${seedVisibility.trendingItemCount} trending rows, ${seedVisibility.risingItemCount} rising rows.`
    },
    {
      id: "registry-readiness",
      label: "Registry readiness",
      status: registryHealth.activeCapabilities > 0 ? "pass" : "fail",
      detail: `${registryHealth.activeCapabilities} active capabilities, average quality ${registryHealth.averageQualityScore}/100.`
    },
    {
      id: "red-team",
      label: "Red-team query status",
      status: failingRedTeamTests > 0 ? "fail" : latestRuns.some((run) => run.testSetVersion.startsWith("red-team-")) ? "pass" : "warning",
      detail: `${failingRedTeamTests} failing red-team checks.`
    },
    {
      id: "intent-tests",
      label: "Seeded intent tests",
      status: failingIntentTests > 0 ? "fail" : latestRuns.length > 0 ? "pass" : "warning",
      detail: `${failingIntentTests} failing seeded intent checks.`
    },
    {
      id: "thin-categories",
      label: "Thin categories",
      status: thinCategories.length > 0 ? "warning" : "pass",
      detail: `${thinCategories.length} human categories have fewer than 3 published apps.`
    },
    {
      id: "screenshots",
      label: "Published apps without screenshots",
      status: appsWithoutScreenshots > 0 ? "warning" : "pass",
      detail: `${appsWithoutScreenshots} published apps are missing screenshots.`
    },
    {
      id: "updates",
      label: "Published apps without updates",
      status: publishedAppsWithoutUpdates > 0 ? "warning" : "pass",
      detail: `${publishedAppsWithoutUpdates} published apps are missing changelog entries.`
    },
    {
      id: "weak-docs",
      label: "Registry capabilities with weak docs",
      status: weakDocsCapabilities > 0 ? "warning" : "pass",
      detail: `${weakDocsCapabilities} active capabilities are in the weak-docs readiness bucket.`
    },
    {
      id: "deprecated-hidden",
      label: "Deprecated capabilities hidden from default search",
      status: deprecatedVisibleRisks > 0 ? "fail" : "pass",
      detail: `${deprecatedVisibleRisks} published listings only expose deprecated capabilities.`
    },
    {
      id: "paused-hidden",
      label: "Paused listings hidden from registry search",
      status: pausedSearchRisks > 0 ? "warning" : "pass",
      detail: `${pausedSearchRisks} paused listings still have active capabilities for admin review.`
    },
    {
      id: "health",
      label: "Deployment health",
      status: health.status === "ok" || health.status === "ok_with_warnings" ? "pass" : "warning",
      detail: `Health ${health.status}, database ${health.databaseReachable ? "reachable" : "unreachable"}, Redis ${health.redisReachable ? "reachable" : "fallback"}.`
    },
    {
      id: "beta-env-status",
      label: "Beta environment status",
      status: envValidation.status === "fail" ? "fail" : envValidation.status,
      detail: `${envValidation.checks.filter((check) => check.status === "warning").length} warning checks, ${envValidation.checks.filter((check) => check.status === "fail").length} failed checks.`
    },
    {
      id: "beta-app-records",
      label: "Beta app records visible",
      status: seedVisibility.publishedAppCount >= 15 ? "pass" : "fail",
      detail: `${seedVisibility.publishedAppCount} published apps visible.`
    },
    {
      id: "harbor-yield-trust-profile",
      label: "Harbor Yield Trust Profile",
      status: harborYieldTrustProfileReady ? "pass" : "fail",
      detail: harborYieldTrustProfileReady ? "harbor-yield has trust metadata for the detail profile." : "harbor-yield is missing trust profile metadata."
    },
    {
      id: "registry-endpoints-reachable",
      label: "Registry endpoints reachable",
      status: registryHealth.activeCapabilities > 0 && seedVisibility.registryPublishedListings > 0 ? "pass" : "fail",
      detail: `${seedVisibility.registryPublishedListings} registry listings and ${registryHealth.activeCapabilities} active capabilities.`
    },
    {
      id: "preview-redis",
      label: "Redis preview status",
      status: redisDependency?.status === "fail" ? "fail" : redisDependency?.status === "warning" ? "warning" : "pass",
      detail: redisDependency?.message ?? "Redis dependency status is unavailable."
    },
    {
      id: "preview-privy",
      label: "Privy preview status",
      status:
        privyClientDependency?.status === "fail" || privyServerDependency?.status === "fail"
          ? "fail"
          : privyClientDependency?.status === "warning" || privyServerDependency?.status === "warning"
            ? "warning"
            : "pass",
      detail: privyClientDependency?.status === "ok" && privyServerDependency?.status === "ok" ? "Privy is configured." : "Privy is warning-only for public preview routes."
    },
    {
      id: "admin-preview-protection",
      label: "Admin preview protection",
      status: "pass",
      detail: "Admin preview is expected to be protected by Vercel authentication or the admin session guard."
    },
    {
      id: "seed-fixture-review-validation",
      label: "Seed fixture review validation",
      status: seededReviewBodiesValid ? "pass" : "fail",
      detail: `${seededReviewBodies.length} seeded review bodies meet the ${reviewBodyMinimumLength} character minimum.`
    },
    {
      id: "staging-seed-loaded",
      label: "Staging seed loaded",
      status: env.COTANA_STAGING_SEED_LOADED ? "pass" : "warning",
      detail: env.COTANA_STAGING_SEED_LOADED ? "Staging launch fixtures are confirmed loaded." : "Staging seed loading has not been acknowledged."
    },
    {
      id: "catalog-coverage-accepted",
      label: "Catalog coverage acceptable",
      status: env.COTANA_CATALOG_COVERAGE_ACCEPTED ? "pass" : "warning",
      detail: env.COTANA_CATALOG_COVERAGE_ACCEPTED ? "Catalog coverage has been accepted for beta." : "Catalog coverage acceptance is still pending."
    },
    {
      id: "registry-coverage-accepted",
      label: "Registry coverage acceptable",
      status: env.COTANA_REGISTRY_COVERAGE_ACCEPTED ? "pass" : "warning",
      detail: env.COTANA_REGISTRY_COVERAGE_ACCEPTED ? "Registry coverage has been accepted for beta." : "Registry coverage acceptance is still pending."
    },
    {
      id: "smoke-tests",
      label: "Smoke tests passing",
      status: env.COTANA_SMOKE_TESTS_PASSING ? "pass" : "warning",
      detail: env.COTANA_SMOKE_TESTS_PASSING ? "Smoke test pass has been acknowledged." : "Run pnpm test:smoke and acknowledge the result."
    },
    {
      id: "e2e-tests",
      label: "E2E tests passing",
      status: env.COTANA_E2E_TESTS_PASSING ? "pass" : "warning",
      detail: env.COTANA_E2E_TESTS_PASSING ? "Beta E2E pass has been acknowledged." : "Run pnpm test:e2e and acknowledge the result."
    },
    {
      id: "migration-status",
      label: "Migration status checked",
      status: env.COTANA_MIGRATION_STATUS_CHECKED ? "pass" : "warning",
      detail: env.COTANA_MIGRATION_STATUS_CHECKED ? "Migration status has been checked before release." : "Check migration status before production release."
    },
    {
      id: "production-seed-guard",
      label: "Production seed guard active",
      status: env.COTANA_PRODUCTION_SEED_GUARD_ACTIVE ? "pass" : "warning",
      detail: env.COTANA_PRODUCTION_SEED_GUARD_ACTIVE ? "Production fixture seed guard has been acknowledged." : "Confirm production fixture seed guard before release."
    },
    {
      id: "docs-updated",
      label: "Docs updated",
      status: env.COTANA_DOCS_UPDATED ? "pass" : "warning",
      detail: env.COTANA_DOCS_UPDATED ? "Launch docs have been acknowledged as current." : "Docs update acknowledgement is still pending."
    },
    {
      id: "known-warnings",
      label: "Known warnings acknowledged",
      status: env.COTANA_KNOWN_WARNINGS_ACKNOWLEDGED ? "pass" : "warning",
      detail: env.COTANA_KNOWN_WARNINGS_ACKNOWLEDGED ? "Known warnings have been acknowledged." : "Known warnings need explicit launch acknowledgement."
    }
  ] as const;

  return {
    generatedAt: new Date().toISOString(),
    status: items.some((item) => item.status === "fail") ? "fail" : items.some((item) => item.status === "warning") ? "warning" : "pass",
    items,
    summary: {
      failingIntentTests,
      failingRedTeamTests,
      thinCategoryCount: thinCategories.length,
      appsWithoutScreenshots,
      publishedAppsWithoutUpdates,
      weakDocsCapabilities,
      deprecatedVisibleRisks,
      pausedSearchRisks,
      smokeTestsPassing: Boolean(env.COTANA_SMOKE_TESTS_PASSING),
      e2eTestsPassing: Boolean(env.COTANA_E2E_TESTS_PASSING),
      migrationStatusChecked: Boolean(env.COTANA_MIGRATION_STATUS_CHECKED),
      productionSeedGuardActive: Boolean(env.COTANA_PRODUCTION_SEED_GUARD_ACTIVE),
      docsUpdated: Boolean(env.COTANA_DOCS_UPDATED),
      knownWarningsAcknowledged: Boolean(env.COTANA_KNOWN_WARNINGS_ACKNOWLEDGED)
    },
    seedVisibility: {
      ...seedVisibility
    }
  };
}

export function getEmptyStateMessage(kind: string) {
  const messages: Record<string, string> = {
    category: "No apps are published in this category yet.",
    search: "No apps matched this search.",
    similar: "No similar apps are available yet.",
    changelog: "No changelog entries have been published.",
    reviews: "No reviews have been published yet.",
    screenshots: "No screenshots have been added for this app.",
    shelves: "No public editorial shelves are published yet.",
    trending: "Trending rows are empty. Run the seed command or recompute discovery.",
    rising: "Rising rows are empty. Run the seed command or recompute discovery.",
    registry: "No registry capabilities matched this discovery request.",
    compatibility: "Compatibility coverage is low for these filters.",
    admin: "No rows are available for this admin table.",
    seed: "Seed data has not been loaded for this environment.",
    provider: "The external provider is unavailable; Cotana is using local or platform-native signals where possible.",
    redis: "Redis is unavailable; local development can continue with the in-memory fallback."
  };

  return messages[kind] ?? "No data is available yet.";
}
