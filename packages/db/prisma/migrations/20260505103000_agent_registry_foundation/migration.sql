CREATE TYPE "AppAudience" AS ENUM ('HUMAN', 'AGENT', 'HYBRID');

CREATE TYPE "AgentAuthType" AS ENUM ('NONE', 'API_KEY', 'OAUTH2', 'MCP', 'CUSTOM');

CREATE TYPE "AgentCapabilityStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DEPRECATED');

ALTER TABLE "App"
ADD COLUMN "agentAudience" "AppAudience" NOT NULL DEFAULT 'HUMAN',
ADD COLUMN "agentSummary" TEXT;

CREATE TABLE "AgentCapability" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "capabilityType" TEXT NOT NULL,
    "authType" "AgentAuthType" NOT NULL DEFAULT 'NONE',
    "endpointUrl" TEXT,
    "inputSchemaJson" JSONB,
    "outputSchemaJson" JSONB,
    "safetyNotes" TEXT,
    "status" "AgentCapabilityStatus" NOT NULL DEFAULT 'ACTIVE',
    "reliabilityScore" DOUBLE PRECISION,
    "latencyP50Ms" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCapability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "App_agentAudience_status_idx" ON "App"("agentAudience", "status");
CREATE UNIQUE INDEX "AgentCapability_appId_slug_key" ON "AgentCapability"("appId", "slug");
CREATE INDEX "AgentCapability_appId_status_idx" ON "AgentCapability"("appId", "status");
CREATE INDEX "AgentCapability_capabilityType_status_idx" ON "AgentCapability"("capabilityType", "status");

ALTER TABLE "AgentCapability"
ADD CONSTRAINT "AgentCapability_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
