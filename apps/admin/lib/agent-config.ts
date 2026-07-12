export const appAudienceValues = ["HUMAN", "AGENT", "HYBRID"] as const;
export type AppAudienceValue = (typeof appAudienceValues)[number];

export const agentListingStatusValues = ["NOT_APPLICABLE", "DRAFT", "PUBLISHED", "PAUSED"] as const;
export type AgentListingStatusValue = (typeof agentListingStatusValues)[number];

export const agentAuthTypeValues = ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"] as const;
export type AgentAuthTypeValue = (typeof agentAuthTypeValues)[number];

export const agentInterfaceTypeValues = ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"] as const;
export type AgentInterfaceTypeValue = (typeof agentInterfaceTypeValues)[number];

export const agentInteractionModeValues = ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"] as const;
export type AgentInteractionModeValue = (typeof agentInteractionModeValues)[number];

export const agentCapabilityStatusValues = ["ACTIVE", "PAUSED", "DEPRECATED"] as const;
export type AgentCapabilityStatusValue = (typeof agentCapabilityStatusValues)[number];
