CREATE TYPE "AgentInterfaceType" AS ENUM ('HTTP_API', 'MCP_SERVER', 'SDK', 'WEBHOOK', 'DATA_FEED', 'DOCS_ONLY');

CREATE TYPE "AgentInteractionMode" AS ENUM ('READ_ONLY', 'WRITE_ACTION', 'TRANSACTIONAL', 'HUMAN_HANDOFF');

ALTER TABLE "AgentCapability"
  ADD COLUMN "interfaceType" "AgentInterfaceType" NOT NULL DEFAULT 'HTTP_API',
  ADD COLUMN "interactionMode" "AgentInteractionMode" NOT NULL DEFAULT 'READ_ONLY';

CREATE INDEX "AgentCapability_interfaceType_interactionMode_status_idx"
  ON "AgentCapability"("interfaceType", "interactionMode", "status");
