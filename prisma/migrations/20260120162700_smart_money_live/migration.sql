-- AlterTable
ALTER TABLE "swaps" ADD COLUMN     "priced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usd_value" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "tokens" ADD COLUMN     "first_seen_at" TIMESTAMP(3),
ADD COLUMN     "first_seen_block" BIGINT,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;
