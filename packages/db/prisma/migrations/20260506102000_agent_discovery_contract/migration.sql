CREATE TYPE "AgentListingStatus" AS ENUM ('NOT_APPLICABLE', 'DRAFT', 'PUBLISHED', 'PAUSED');

ALTER TABLE "App"
  ADD COLUMN "agentListingStatus" "AgentListingStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "agentDocsUrl" TEXT,
  ADD COLUMN "agentIntegrationNotes" TEXT;

ALTER TABLE "AgentCapability"
  ADD COLUMN "docsUrl" TEXT;

UPDATE "App"
SET "agentListingStatus" = 'PUBLISHED'
WHERE "agentAudience" IN ('AGENT', 'HYBRID')
  AND EXISTS (
    SELECT 1
    FROM "AgentCapability"
    WHERE "AgentCapability"."appId" = "App"."id"
      AND "AgentCapability"."status" = 'ACTIVE'
  );

DROP INDEX IF EXISTS "App_agentAudience_status_idx";

CREATE INDEX "App_agentAudience_agentListingStatus_status_idx"
  ON "App"("agentAudience", "agentListingStatus", "status");
