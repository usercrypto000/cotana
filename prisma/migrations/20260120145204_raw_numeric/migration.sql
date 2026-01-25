-- AlterTable
ALTER TABLE "swaps" ALTER COLUMN "amount_in_raw" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "amount_out_raw" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "token_transfers" ALTER COLUMN "amount_raw" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "value" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "wallet_positions" ALTER COLUMN "balance_raw" SET DATA TYPE DECIMAL(65,30);
