-- CreateEnum
CREATE TYPE "IncidentLifecycleState" AS ENUM ('OPEN', 'EXPANDING', 'CONTAINED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "IncidentRelationType" AS ENUM ('MERGED', 'SPLIT');

-- CreateEnum
CREATE TYPE "ActorAddressType" AS ENUM ('EOA', 'CONTRACT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CashoutPathType" AS ENUM ('DEX_SWAP', 'BRIDGE_EXIT', 'CEX_DEPOSIT');

-- AlterTable
ALTER TABLE "incident_rule_hits" ADD COLUMN     "rule_version" TEXT NOT NULL DEFAULT 'v1';

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "confidence_over_time" JSONB,
ADD COLUMN     "dedupe_key" TEXT NOT NULL,
ADD COLUMN     "last_activity_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "lifecycle_state" "IncidentLifecycleState" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "peak_loss_usd" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "project_key" TEXT,
ADD COLUMN     "rule_version" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "address_suppressions" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "reason" TEXT,
    "suppressed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "address_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_bot_scores" (
    "id" SERIAL NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "wallet" TEXT NOT NULL,
    "window" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_bot_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allowed_chains" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "project_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incident_threshold" INTEGER NOT NULL DEFAULT 70,
    "alert_threshold" INTEGER NOT NULL DEFAULT 75,
    "sse_rate_limit_per_min" INTEGER NOT NULL DEFAULT 120,
    "ws_rate_limit_per_min" INTEGER NOT NULL DEFAULT 300,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_api_keys" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "key_hash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "tenant_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_relations" (
    "id" BIGSERIAL NOT NULL,
    "from_incident_id" BIGINT NOT NULL,
    "to_incident_id" BIGINT NOT NULL,
    "relation_type" "IncidentRelationType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_clusters" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "stable_id" TEXT NOT NULL,
    "cluster_key" TEXT NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actor_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actor_cluster_members" (
    "id" BIGSERIAL NOT NULL,
    "cluster_id" BIGINT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "address_type" "ActorAddressType" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actor_cluster_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_actor_clusters" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" BIGINT NOT NULL,
    "cluster_id" BIGINT NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_actor_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_cashout_paths" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" BIGINT NOT NULL,
    "path_type" "CashoutPathType" NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "total_usd" DECIMAL(65,30),
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "path" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_cashout_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replay_jobs" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "requested_by" TEXT,
    "lookback_hours" INTEGER NOT NULL,
    "rule_version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "replay_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "address_suppressions_chain_id_address_key" ON "address_suppressions"("chain_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_bot_scores_chain_id_wallet_window_key" ON "wallet_bot_scores"("chain_id", "wallet", "window");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_api_keys_key_hash_key" ON "tenant_api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "tenant_api_keys_tenant_id_active_idx" ON "tenant_api_keys"("tenant_id", "active");

-- CreateIndex
CREATE INDEX "incident_relations_to_incident_id_relation_type_idx" ON "incident_relations"("to_incident_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "incident_relations_from_incident_id_to_incident_id_relation_key" ON "incident_relations"("from_incident_id", "to_incident_id", "relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "actor_clusters_stable_id_key" ON "actor_clusters"("stable_id");

-- CreateIndex
CREATE INDEX "actor_clusters_tenant_id_last_seen_at_idx" ON "actor_clusters"("tenant_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "actor_clusters_tenant_id_cluster_key_key" ON "actor_clusters"("tenant_id", "cluster_key");

-- CreateIndex
CREATE INDEX "actor_cluster_members_chain_id_address_idx" ON "actor_cluster_members"("chain_id", "address");

-- CreateIndex
CREATE UNIQUE INDEX "actor_cluster_members_cluster_id_chain_id_address_key" ON "actor_cluster_members"("cluster_id", "chain_id", "address");

-- CreateIndex
CREATE INDEX "incident_actor_clusters_cluster_id_created_at_idx" ON "incident_actor_clusters"("cluster_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incident_actor_clusters_incident_id_cluster_id_key" ON "incident_actor_clusters"("incident_id", "cluster_id");

-- CreateIndex
CREATE INDEX "incident_cashout_paths_incident_id_created_at_idx" ON "incident_cashout_paths"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_cashout_paths_chain_id_path_type_created_at_idx" ON "incident_cashout_paths"("chain_id", "path_type", "created_at");

-- CreateIndex
CREATE INDEX "replay_jobs_tenant_id_created_at_idx" ON "replay_jobs"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_dedupe_key_key" ON "incidents"("dedupe_key");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_chain_id_status_updated_at_idx" ON "incidents"("tenant_id", "chain_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_lifecycle_state_updated_at_idx" ON "incidents"("tenant_id", "lifecycle_state", "updated_at");

-- CreateIndex
CREATE INDEX "incidents_tenant_id_chain_id_root_key_idx" ON "incidents"("tenant_id", "chain_id", "root_key");

-- AddForeignKey
ALTER TABLE "tenant_api_keys" ADD CONSTRAINT "tenant_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_relations" ADD CONSTRAINT "incident_relations_from_incident_id_fkey" FOREIGN KEY ("from_incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_relations" ADD CONSTRAINT "incident_relations_to_incident_id_fkey" FOREIGN KEY ("to_incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_clusters" ADD CONSTRAINT "actor_clusters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actor_cluster_members" ADD CONSTRAINT "actor_cluster_members_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "actor_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_actor_clusters" ADD CONSTRAINT "incident_actor_clusters_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_actor_clusters" ADD CONSTRAINT "incident_actor_clusters_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "actor_clusters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_cashout_paths" ADD CONSTRAINT "incident_cashout_paths_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replay_jobs" ADD CONSTRAINT "replay_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "contract_balance_deltas_chain_id_contract_address_block_number_" RENAME TO "contract_balance_deltas_chain_id_contract_address_block_num_key";

-- RenameIndex
ALTER INDEX "contract_balance_deltas_chain_id_contract_address_block_timesta" RENAME TO "contract_balance_deltas_chain_id_contract_address_block_tim_idx";

-- RenameIndex
ALTER INDEX "contract_method_stats_chain_id_contract_address_last_seen_at_id" RENAME TO "contract_method_stats_chain_id_contract_address_last_seen_a_idx";

-- RenameIndex
ALTER INDEX "entity_graph_edges_chain_id_from_address_to_address_edge_type_k" RENAME TO "entity_graph_edges_chain_id_from_address_to_address_edge_ty_key";

