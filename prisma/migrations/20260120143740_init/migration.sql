-- CreateTable
CREATE TABLE "chains" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "chain_id" INTEGER NOT NULL,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "number" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "parent_hash" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "value" BIGINT NOT NULL,
    "status" INTEGER,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "block_number" BIGINT NOT NULL,
    "address" TEXT NOT NULL,
    "topic0" TEXT,
    "topics" JSONB NOT NULL,
    "data" TEXT NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_transfers" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "block_number" BIGINT NOT NULL,
    "token" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount_raw" BIGINT NOT NULL,
    "amount_dec" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "token_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swaps" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "log_index" INTEGER NOT NULL,
    "block_number" BIGINT NOT NULL,
    "dex" TEXT NOT NULL,
    "pool" TEXT NOT NULL,
    "trader" TEXT,
    "token_in" TEXT NOT NULL,
    "token_out" TEXT NOT NULL,
    "amount_in_raw" BIGINT NOT NULL,
    "amount_out_raw" BIGINT NOT NULL,
    "amount_in_dec" TEXT NOT NULL,
    "amount_out_dec" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL,

    CONSTRAINT "swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prices" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "timestamp_minute" INTEGER NOT NULL,
    "price_usd" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_positions" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "balance_raw" BIGINT NOT NULL,
    "balance_dec" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_token_pnl" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "realized_pnl_usd_30d" DECIMAL(65,30) NOT NULL,
    "realized_pnl_usd_all" DECIMAL(65,30) NOT NULL,
    "win_trades_30d" INTEGER NOT NULL,
    "loss_trades_30d" INTEGER NOT NULL,
    "avg_hold_seconds_30d" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_token_pnl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_scores" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "features_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "labels" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address_labels" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "label_id" INTEGER NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL,
    "source" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chains_chain_id_key" ON "chains"("chain_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_chain_id_number_key" ON "blocks"("chain_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_chain_id_hash_key" ON "transactions"("chain_id", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "logs_chain_id_tx_hash_log_index_key" ON "logs"("chain_id", "tx_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "token_transfers_chain_id_tx_hash_log_index_key" ON "token_transfers"("chain_id", "tx_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "swaps_chain_id_tx_hash_log_index_key" ON "swaps"("chain_id", "tx_hash", "log_index");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_chain_id_address_key" ON "tokens"("chain_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "prices_chain_id_token_timestamp_minute_key" ON "prices"("chain_id", "token", "timestamp_minute");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_positions_chain_id_wallet_token_key" ON "wallet_positions"("chain_id", "wallet", "token");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_token_pnl_chain_id_wallet_token_key" ON "wallet_token_pnl"("chain_id", "wallet", "token");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_scores_chain_id_wallet_window_key" ON "wallet_scores"("chain_id", "wallet", "window");

-- CreateIndex
CREATE UNIQUE INDEX "labels_label_key" ON "labels"("label");

-- CreateIndex
CREATE UNIQUE INDEX "address_labels_chain_id_address_label_id_key" ON "address_labels"("chain_id", "address", "label_id");
