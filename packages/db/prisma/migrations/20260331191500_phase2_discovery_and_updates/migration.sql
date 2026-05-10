CREATE TYPE "AppUpdateType" AS ENUM ('GENERAL', 'FEATURE', 'FIX', 'PERFORMANCE', 'SECURITY');

CREATE TYPE "DiscoveryInsightKind" AS ENUM ('TRENDING', 'RISING', 'COMMUNITY_PICK');

ALTER TABLE "App"
ADD COLUMN "verifiedNote" TEXT,
ADD COLUMN "verifiedUpdatedAt" TIMESTAMP(3),
ADD COLUMN "communityPick" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "communityPickMonth" TEXT,
ADD COLUMN "communityPickReason" JSONB,
ADD COLUMN "communityPickUpdatedAt" TIMESTAMP(3);

CREATE TABLE "AppUpdate" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "type" "AppUpdateType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscoveryInsightSnapshot" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "kind" "DiscoveryInsightKind" NOT NULL,
    "categorySlug" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryInsightSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "App_communityPick_communityPickUpdatedAt_idx" ON "App"("communityPick", "communityPickUpdatedAt");
CREATE INDEX "AppSignalSnapshot_category_metric_observedAt_idx" ON "AppSignalSnapshot"("category", "metric", "observedAt");
CREATE INDEX "AppUpdate_appId_publishedAt_idx" ON "AppUpdate"("appId", "publishedAt");
CREATE INDEX "DiscoveryInsightSnapshot_kind_categorySlug_computedAt_rank_idx" ON "DiscoveryInsightSnapshot"("kind", "categorySlug", "computedAt", "rank");
CREATE INDEX "DiscoveryInsightSnapshot_appId_kind_computedAt_idx" ON "DiscoveryInsightSnapshot"("appId", "kind", "computedAt");

ALTER TABLE "AppUpdate"
ADD CONSTRAINT "AppUpdate_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DiscoveryInsightSnapshot"
ADD CONSTRAINT "DiscoveryInsightSnapshot_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
