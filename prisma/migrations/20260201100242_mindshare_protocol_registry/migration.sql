/*
  Warnings:

  - You are about to alter the column `repeat_rate` on the `protocol_metrics` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `median_actions_per_wallet` on the `protocol_metrics` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `value_moved_usd` on the `protocol_metrics` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to alter the column `score` on the `protocol_metrics` table. The data in that column could be lost. The data in that column will be cast from `Decimal` to `Decimal(65,30)`.
  - You are about to drop the column `chain_id` on the `protocols` table. All the data in the column will be lost.
  - You are about to drop the column `raw_json` on the `raw_interactions` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_type` on the `raw_interactions` table. All the data in the column will be lost.
  - Made the column `created_at` on table `protocol_contracts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `protocol_contracts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_meaningful` on table `protocol_event_maps` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `chainId` to the `protocols` table without a default value. This is not possible if the table is not empty.
  - Made the column `created_at` on table `protocols` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `protocols` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `walletType` to the `raw_interactions` table without a default value. This is not possible if the table is not empty.
  - Made the column `action_count` on table `raw_interactions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "protocol_contracts" DROP CONSTRAINT "protocol_contracts_protocol_id_fkey";

-- DropForeignKey
ALTER TABLE "protocol_event_maps" DROP CONSTRAINT "protocol_event_maps_protocol_id_fkey";

-- DropForeignKey
ALTER TABLE "protocol_metrics" DROP CONSTRAINT "protocol_metrics_protocol_id_fkey";

-- DropForeignKey
ALTER TABLE "raw_interactions" DROP CONSTRAINT "raw_interactions_protocol_id_fkey";

-- AlterTable
ALTER TABLE "protocol_contracts" ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "protocol_event_maps" ALTER COLUMN "is_meaningful" SET NOT NULL;

-- AlterTable
ALTER TABLE "protocol_metrics" ALTER COLUMN "as_of" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "uaw_direct" DROP DEFAULT,
ALTER COLUMN "uaw_event" DROP DEFAULT,
ALTER COLUMN "uaw_attributed" DROP DEFAULT,
ALTER COLUMN "eoa_uaw" DROP DEFAULT,
ALTER COLUMN "sw_uaw" DROP DEFAULT,
ALTER COLUMN "repeat_rate" DROP DEFAULT,
ALTER COLUMN "repeat_rate" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "median_actions_per_wallet" DROP DEFAULT,
ALTER COLUMN "median_actions_per_wallet" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "value_moved_usd" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "score" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "protocols" DROP COLUMN "chain_id",
ADD COLUMN     "chainId" INTEGER NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "raw_interactions" DROP COLUMN "raw_json",
DROP COLUMN "wallet_type",
ADD COLUMN     "rawJson" JSONB,
ADD COLUMN     "walletType" TEXT NOT NULL,
ALTER COLUMN "block_time" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "day" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "action_count" SET NOT NULL;

-- CreateTable
CREATE TABLE "mindshare_protocols" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mindshare_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mindshare_protocol_contracts" (
    "id" SERIAL NOT NULL,
    "protocol_id" INTEGER NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "active_from" TIMESTAMP(3),
    "active_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mindshare_protocol_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mindshare_protocols_slug_key" ON "mindshare_protocols"("slug");

-- CreateIndex
CREATE INDEX "mindshare_protocol_contracts_chain_id_address_idx" ON "mindshare_protocol_contracts"("chain_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "mindshare_protocol_contracts_protocol_id_chain_id_address_key" ON "mindshare_protocol_contracts"("protocol_id", "chain_id", "address");

-- AddForeignKey
ALTER TABLE "mindshare_protocol_contracts" ADD CONSTRAINT "mindshare_protocol_contracts_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "mindshare_protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_contracts" ADD CONSTRAINT "protocol_contracts_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_event_maps" ADD CONSTRAINT "protocol_event_maps_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "protocol_metrics" ADD CONSTRAINT "protocol_metrics_protocol_id_fkey" FOREIGN KEY ("protocol_id") REFERENCES "protocols"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "protocol_contracts_chain_address_idx" RENAME TO "protocol_contracts_chain_id_address_idx";

-- RenameIndex
ALTER INDEX "protocol_event_maps_chain_address_idx" RENAME TO "protocol_event_maps_chain_id_contract_address_idx";

-- RenameIndex
ALTER INDEX "protocol_metrics_protocol_asof_idx" RENAME TO "protocol_metrics_protocol_id_as_of_idx";

-- RenameIndex
ALTER INDEX "raw_interactions_protocol_day_idx" RENAME TO "raw_interactions_protocol_id_day_idx";
