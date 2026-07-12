export const cotanaRegistryContract = {
  schemaVersion: "2026-05-17",
  registryVersion: "2026-05-17",
  purpose: "discovery",
  docsPath: "/agent-registry/docs",
  endpoints: {
    discovery: "/.well-known/cotana-agent-registry",
    registry: "/api/agent-registry",
    manifest: "/api/agent-registry/{slug}",
    capabilityManifest: "/api/agent-registry/{slug}/capabilities/{capabilitySlug}",
    search: "/api/agent-registry/search?q={intent}",
    schema: "/api/agent-registry/schema",
    categories: "/api/agent-registry/categories",
    capabilities: "/api/agent-registry/capabilities",
    compatibility: "/api/agent-registry/compatibility?auth={auth}&interface={interface}&interaction={interaction}",
    health: "/api/agent-registry/health",
    policy: "/api/agent-registry/policy",
    docs: "/agent-registry/docs",
    llms: "/llms.txt",
    stats: "/api/agent-registry/stats"
  },
  discoveryOnly: {
    cotanaRole: "DISCOVERY_ONLY",
    execution: "EXTERNAL_APP",
    credentialHandling: "NOT_HANDLED_BY_COTANA",
    walletActions: "NOT_INITIATED_BY_COTANA",
    downstreamRouting: "NOT_ROUTED_BY_COTANA"
  },
  supportedFilters: {
    auth: ["NONE", "API_KEY", "OAUTH2", "MCP", "CUSTOM"],
    interface: ["HTTP_API", "MCP_SERVER", "SDK", "WEBHOOK", "DATA_FEED", "DOCS_ONLY"],
    interaction: ["READ_ONLY", "WRITE_ACTION", "TRANSACTIONAL", "HUMAN_HANDOFF"]
  }
} as const;

export function buildRegistryVersionMetadata(generatedAt = new Date()) {
  return {
    schemaVersion: cotanaRegistryContract.schemaVersion,
    registryVersion: cotanaRegistryContract.registryVersion,
    generatedAt: generatedAt.toISOString(),
    discoveryOnly: cotanaRegistryContract.discoveryOnly,
    supportedEndpoints: cotanaRegistryContract.endpoints
  };
}

export const registryClientExamples = [
  { label: "Discovery document", command: "curl https://cotana.app/.well-known/cotana-agent-registry" },
  { label: "Schema", command: "curl https://cotana.app/api/agent-registry/schema" },
  { label: "Registry search", command: "curl 'https://cotana.app/api/agent-registry/search?q=yield&interaction=READ_ONLY'" },
  { label: "Compatibility", command: "curl 'https://cotana.app/api/agent-registry/compatibility?interaction=READ_ONLY&auth=NONE'" },
  { label: "App manifest", command: "curl https://cotana.app/api/agent-registry/harbor-yield" },
  {
    label: "Capability manifest",
    command: "curl https://cotana.app/api/agent-registry/harbor-yield/capabilities/compare-yield-options"
  },
  { label: "Policy", command: "curl https://cotana.app/api/agent-registry/policy" },
  { label: "llms.txt", command: "curl https://cotana.app/llms.txt" }
] as const;

export const analyticsQaEvents = [
  "search_submitted",
  "search_result_clicked",
  "app_detail_viewed",
  "app_liked",
  "app_saved",
  "review_created",
  "shelf_app_clicked",
  "trending_app_clicked",
  "rising_app_clicked",
  "agent_registry_searched",
  "agent_registry_manifest_viewed",
  "agent_registry_schema_viewed",
  "agent_registry_compatibility_viewed"
] as const;
