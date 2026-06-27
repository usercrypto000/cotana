ALTER TABLE "App"
  ADD COLUMN "agentManifestVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "agentLastReviewedAt" TIMESTAMP(3);

ALTER TABLE "AgentCapability"
  ADD COLUMN "manifestVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
  ADD COLUMN "deprecatedAt" TIMESTAMP(3),
  ADD COLUMN "deprecationReason" TEXT,
  ADD COLUMN "replacementCapabilityId" TEXT,
  ADD COLUMN "replacementDocsUrl" TEXT;

CREATE TABLE "AgentRegistryChangeLog" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "capabilityId" TEXT,
  "changeType" TEXT NOT NULL,
  "fieldName" TEXT NOT NULL,
  "previousValueJson" JSONB,
  "nextValueJson" JSONB,
  "internalNote" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentRegistryChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentRegistryChangeLog_appId_createdAt_idx"
  ON "AgentRegistryChangeLog"("appId", "createdAt");

CREATE INDEX "AgentRegistryChangeLog_capabilityId_createdAt_idx"
  ON "AgentRegistryChangeLog"("capabilityId", "createdAt");

CREATE INDEX "AgentRegistryChangeLog_changeType_createdAt_idx"
  ON "AgentRegistryChangeLog"("changeType", "createdAt");

ALTER TABLE "AgentRegistryChangeLog"
  ADD CONSTRAINT "AgentRegistryChangeLog_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentRegistryChangeLog"
  ADD CONSTRAINT "AgentRegistryChangeLog_capabilityId_fkey"
  FOREIGN KEY ("capabilityId") REFERENCES "AgentCapability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
