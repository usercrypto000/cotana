ALTER TABLE "AgentRegistryEvaluationLog"
  ADD COLUMN "topAppSlug" TEXT,
  ADD COLUMN "topCapabilitySlug" TEXT,
  ADD COLUMN "topAuthType" TEXT,
  ADD COLUMN "topInterfaceType" TEXT,
  ADD COLUMN "topInteractionMode" TEXT;

CREATE INDEX "AgentRegistryEvaluationLog_topAppSlug_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topAppSlug", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topAuthType_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topAuthType", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topInterfaceType_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topInterfaceType", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topInteractionMode_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topInteractionMode", "createdAt");

ALTER TABLE "AgentRegistryIntentTestRun"
  ADD COLUMN "testSetVersion" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN "expectedAppSlugsJson" JSONB,
  ADD COLUMN "qualityScore" INTEGER,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "AgentRegistryIntentTestRun_testSetVersion_ranAt_idx"
  ON "AgentRegistryIntentTestRun"("testSetVersion", "ranAt");
