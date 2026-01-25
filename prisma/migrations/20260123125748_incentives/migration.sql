-- CreateEnum
CREATE TYPE "IncentiveStatus" AS ENUM ('EARLY', 'ACTIVE', 'SATURATED', 'ENDING');

-- CreateEnum
CREATE TYPE "RewardAssetType" AS ENUM ('TOKEN', 'POINTS', 'FEES');

-- CreateEnum
CREATE TYPE "CapitalRequirement" AS ENUM ('NONE', 'LOW', 'MED', 'HIGH');

-- CreateEnum
CREATE TYPE "TimeIntensity" AS ENUM ('PASSIVE', 'SEMI', 'ACTIVE');

-- CreateEnum
CREATE TYPE "LinkTier" AS ENUM ('TIER1', 'TIER2', 'TIER3');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('APP', 'BRIDGE', 'DEX', 'DOCS', 'SNAPSHOT', 'REFERRAL', 'FORUM', 'GUIDE', 'BLOG', 'DASHBOARD', 'EXPLORER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "logo_url" TEXT,
    "chains" TEXT[],
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_links" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "tier" "LinkTier" NOT NULL,
    "type" "LinkType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentives" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "status" "IncentiveStatus" NOT NULL,
    "types" TEXT[],
    "reward_asset_type" "RewardAssetType" NOT NULL,
    "reward_asset_symbol" TEXT,
    "reward_asset_address" TEXT,
    "reward_asset_chain" TEXT,
    "capital_required" "CapitalRequirement" NOT NULL,
    "time_intensity" "TimeIntensity" NOT NULL,
    "riskFlags" TEXT[],
    "risk_score" INTEGER,
    "saturation_score" INTEGER,
    "roi_label" TEXT,
    "effort_label" TEXT,
    "flow_summary" TEXT,
    "status_rationale" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "last_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_events" (
    "id" SERIAL NOT NULL,
    "incentive_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "event_type" TEXT NOT NULL,
    "effective_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incentive_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_links" (
    "id" SERIAL NOT NULL,
    "incentive_id" INTEGER NOT NULL,
    "type" "LinkType" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tier" "LinkTier",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incentive_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_proofs" (
    "id" SERIAL NOT NULL,
    "incentive_id" INTEGER NOT NULL,
    "proof_type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "chain" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incentive_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_metrics" (
    "id" SERIAL NOT NULL,
    "incentive_id" INTEGER NOT NULL,
    "tvl_usd" DECIMAL(65,30),
    "volume_usd_24h" DECIMAL(65,30),
    "emissions_per_day_usd" DECIMAL(65,30),
    "users_7d" INTEGER,
    "reward_apr" DECIMAL(65,30),
    "data_ages" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incentive_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "LinkTier" NOT NULL,
    "url" TEXT,
    "ingestion_type" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incentive_updates" (
    "id" SERIAL NOT NULL,
    "incentive_id" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "incentive_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "incentive_metrics_incentive_id_key" ON "incentive_metrics"("incentive_id");

-- AddForeignKey
ALTER TABLE "project_links" ADD CONSTRAINT "project_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_events" ADD CONSTRAINT "incentive_events_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "incentives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_links" ADD CONSTRAINT "incentive_links_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "incentives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_proofs" ADD CONSTRAINT "incentive_proofs_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "incentives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_metrics" ADD CONSTRAINT "incentive_metrics_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "incentives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incentive_updates" ADD CONSTRAINT "incentive_updates_incentive_id_fkey" FOREIGN KEY ("incentive_id") REFERENCES "incentives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
