/*
  Warnings:

  - You are about to drop the column `data_ages` on the `incentive_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `emissions_per_day_usd` on the `incentive_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `reward_apr` on the `incentive_metrics` table. All the data in the column will be lost.
  - You are about to drop the column `users_7d` on the `incentive_metrics` table. All the data in the column will be lost.
  - You are about to drop the `incentive_updates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "incentive_updates" DROP CONSTRAINT "incentive_updates_incentive_id_fkey";

-- AlterTable
ALTER TABLE "incentive_metrics" DROP COLUMN "data_ages",
DROP COLUMN "emissions_per_day_usd",
DROP COLUMN "reward_apr",
DROP COLUMN "users_7d";

-- AlterTable
ALTER TABLE "incentives" ADD COLUMN     "defillama_slug" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "how_to_extract" TEXT,
ADD COLUMN     "participation_url" TEXT,
ADD COLUMN     "reward_assets" TEXT,
ADD COLUMN     "snapshot_window" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "x_handle_url" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "raise" TEXT;

-- DropTable
DROP TABLE "incentive_updates";

-- DropEnum
DROP TYPE "ReviewStatus";
