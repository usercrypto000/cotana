CREATE TABLE "AgentRegistryEvaluationLog" (
  "id" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "filtersJson" JSONB NOT NULL,
  "resultCount" INTEGER NOT NULL,
  "candidateCount" INTEGER NOT NULL,
  "matchedCapabilityCount" INTEGER NOT NULL,
  "topAppId" TEXT,
  "topCapabilityId" TEXT,
  "topSimilarity" DOUBLE PRECISION,
  "topScore" DOUBLE PRECISION,
  "topQualityScore" INTEGER,
  "topMatchReason" TEXT,
  "excludedCandidatesJson" JSONB NOT NULL,
  "blockingIssueCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentRegistryEvaluationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentRegistryEvaluationLog_normalizedQuery_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("normalizedQuery", "createdAt");

CREATE INDEX "AgentRegistryEvaluationLog_topAppId_createdAt_idx"
  ON "AgentRegistryEvaluationLog"("topAppId", "createdAt");
