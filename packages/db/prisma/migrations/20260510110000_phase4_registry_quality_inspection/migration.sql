ALTER TABLE "AgentRegistryEvaluationLog"
  ADD COLUMN "topCategorySlug" TEXT,
  ADD COLUMN "topCapabilityType" TEXT,
  ADD COLUMN "topReadinessBucket" TEXT;

CREATE INDEX "AgentRegistryEvaluationLog_topCategorySlug_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topCategorySlug", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topCapabilityType_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topCapabilityType", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topReadinessBucket_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topReadinessBucket", "createdAt");

CREATE TABLE "AgentRegistryIntentTestRun" (
  "id" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "filtersJson" JSONB NOT NULL,
  "expectedCategorySlug" TEXT,
  "expectedCapabilityTypesJson" JSONB,
  "expectedCapabilitySlugsJson" JSONB,
  "topMatchedAppId" TEXT,
  "topMatchedAppSlug" TEXT,
  "topMatchedCategorySlug" TEXT,
  "topMatchedCapabilityId" TEXT,
  "topMatchedCapabilitySlug" TEXT,
  "topMatchedCapabilityType" TEXT,
  "score" DOUBLE PRECISION,
  "matchReason" TEXT,
  "passed" BOOLEAN NOT NULL,
  "failureReason" TEXT,
  "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentRegistryIntentTestRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentRegistryIntentTestRun_testCaseId_ranAt_idx"
  ON "AgentRegistryIntentTestRun"("testCaseId", "ranAt");

CREATE INDEX "AgentRegistryIntentTestRun_passed_ranAt_idx"
  ON "AgentRegistryIntentTestRun"("passed", "ranAt");

CREATE INDEX "AgentRegistryIntentTestRun_expectedCategorySlug_ranAt_idx"
  ON "AgentRegistryIntentTestRun"("expectedCategorySlug", "ranAt");
