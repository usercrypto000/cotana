-- AlterTable
ALTER TABLE "incentive_metrics" ADD COLUMN     "volume_usd_30d" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "incentives" ADD COLUMN     "perps_slug" TEXT;
