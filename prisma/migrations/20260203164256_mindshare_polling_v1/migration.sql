-- CreateTable
CREATE TABLE "mindshare_cursors" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "last_processed_block" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mindshare_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_contract_cache" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "is_contract" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_contract_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_interactions" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "address_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mindshare_address_stats" (
    "id" SERIAL NOT NULL,
    "window" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "uaw_est" INTEGER NOT NULL,
    "tx_count" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mindshare_address_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mindshare_address_changes" (
    "id" SERIAL NOT NULL,
    "window" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "uaw_est" INTEGER NOT NULL,
    "tx_count" INTEGER NOT NULL,
    "delta_uaw" INTEGER NOT NULL,
    "delta_tx" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mindshare_address_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_metadata" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "label" TEXT,
    "label_source" TEXT,
    "confidence" INTEGER,
    "is_verified" BOOLEAN,
    "is_proxy" BOOLEAN,
    "implementation_address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mindshare_cursors_chain_id_key" ON "mindshare_cursors"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "address_contract_cache_chain_id_address_key" ON "address_contract_cache"("chain_id", "address");

-- CreateIndex
CREATE INDEX "address_interactions_address_block_time_idx" ON "address_interactions"("address", "block_time");

-- CreateIndex
CREATE UNIQUE INDEX "mindshare_address_stats_window_chain_id_address_key" ON "mindshare_address_stats"("window", "chain_id", "address");

-- CreateIndex
CREATE INDEX "mindshare_address_changes_window_chain_id_idx" ON "mindshare_address_changes"("window", "chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "address_metadata_chain_id_address_key" ON "address_metadata"("chain_id", "address");
