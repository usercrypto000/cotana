-- CreateEnum
CREATE TYPE "TenantBillingModel" AS ENUM ('INCIDENT_VOLUME', 'MONITORED_TVL');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "auto_resolved_at" TIMESTAMP(3),
ADD COLUMN     "confidence_decay_rate" DECIMAL(65,30) NOT NULL DEFAULT 0.08,
ADD COLUMN     "ioc_bundle" JSONB,
ADD COLUMN     "lock_reason" TEXT,
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "locked_by" TEXT,
ADD COLUMN     "public_visible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "billing_model" "TenantBillingModel" NOT NULL DEFAULT 'INCIDENT_VOLUME',
ADD COLUMN     "incident_volume_cap" INTEGER,
ADD COLUMN     "monitored_tvl_usd" DECIMAL(65,30),
ADD COLUMN     "public_feed_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trial_alert_delay_sec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trial_mode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tenant_rule_configs" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "rule_id" TEXT NOT NULL,
    "min_score" INTEGER,
    "weight" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_rule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_fund_flow_paths" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" BIGINT NOT NULL,
    "chain_id" INTEGER NOT NULL,
    "path_hash" TEXT NOT NULL,
    "source_address" TEXT NOT NULL,
    "sink_address" TEXT NOT NULL,
    "hop_count" INTEGER NOT NULL,
    "total_input_usd" DECIMAL(65,30),
    "total_output_usd" DECIMAL(65,30),
    "conservation_ratio" DECIMAL(65,30),
    "hops" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_fund_flow_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_lifecycle_snapshots" (
    "id" BIGSERIAL NOT NULL,
    "incident_id" BIGINT NOT NULL,
    "from_state" "IncidentLifecycleState",
    "to_state" "IncidentLifecycleState" NOT NULL,
    "score" INTEGER NOT NULL,
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "estimated_loss_usd" DECIMAL(65,30),
    "reason" TEXT,
    "cluster_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_lifecycle_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "incident_id" BIGINT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_webhook_endpoints" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "event_types" TEXT[] DEFAULT ARRAY['incident.created', 'incident.updated']::TEXT[],
    "max_retries" INTEGER NOT NULL DEFAULT 8,
    "timeout_ms" INTEGER NOT NULL DEFAULT 8000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "incident_id" BIGINT,
    "endpoint_id" BIGINT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_key" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL DEFAULT '2026-02-06.1',
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3) NOT NULL,
    "last_error" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_rule_configs_tenant_id_suppressed_idx" ON "tenant_rule_configs"("tenant_id", "suppressed");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_rule_configs_tenant_id_rule_id_key" ON "tenant_rule_configs"("tenant_id", "rule_id");

-- CreateIndex
CREATE INDEX "incident_fund_flow_paths_incident_id_created_at_idx" ON "incident_fund_flow_paths"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_fund_flow_paths_chain_id_created_at_idx" ON "incident_fund_flow_paths"("chain_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incident_fund_flow_paths_incident_id_path_hash_key" ON "incident_fund_flow_paths"("incident_id", "path_hash");

-- CreateIndex
CREATE INDEX "incident_lifecycle_snapshots_incident_id_created_at_idx" ON "incident_lifecycle_snapshots"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_audit_logs_tenant_id_created_at_idx" ON "incident_audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "incident_audit_logs_incident_id_created_at_idx" ON "incident_audit_logs"("incident_id", "created_at");

-- CreateIndex
CREATE INDEX "tenant_webhook_endpoints_tenant_id_active_idx" ON "tenant_webhook_endpoints"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_webhook_endpoints_tenant_id_url_key" ON "tenant_webhook_endpoints"("tenant_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_event_key_key" ON "webhook_deliveries"("event_key");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_tenant_id_created_at_idx" ON "webhook_deliveries"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpoint_id_created_at_idx" ON "webhook_deliveries"("endpoint_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_rule_configs" ADD CONSTRAINT "tenant_rule_configs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_fund_flow_paths" ADD CONSTRAINT "incident_fund_flow_paths_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_lifecycle_snapshots" ADD CONSTRAINT "incident_lifecycle_snapshots_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_audit_logs" ADD CONSTRAINT "incident_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_audit_logs" ADD CONSTRAINT "incident_audit_logs_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_webhook_endpoints" ADD CONSTRAINT "tenant_webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "tenant_webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

