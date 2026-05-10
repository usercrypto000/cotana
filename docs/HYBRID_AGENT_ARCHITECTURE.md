# Hybrid Agent Discovery Architecture

Cotana is a discovery channel for humans and AI agents. Humans use the public store to find apps. Agents use the registry to find dapps with machine-usable capabilities. Cotana does not execute downstream app actions, custody credentials, route wallet operations, or complete tasks on behalf of the agent.

## Product Boundary

Cotana answers one question for agents: which app can provide the capability needed for this intent?

The agent registry only includes apps with a real machine-usable surface. Eligible surfaces include public APIs, documented SDKs, MCP servers, stable data endpoints, webhook feeds, structured schemas, or permissioned integration flows. A dapp that only exposes a human web interface remains human-only.

## Listing States

Human store publication and agent registry publication are separate controls.

`agentAudience` defines the intended audience:

- `HUMAN`: visible only in the consumer store.
- `AGENT`: visible only in agent discovery surfaces.
- `HYBRID`: visible in both consumer and agent discovery surfaces.

`agentListingStatus` controls registry visibility:

- `NOT_APPLICABLE`: no agent registry listing exists.
- `DRAFT`: agent metadata exists but is not discoverable.
- `PUBLISHED`: the app is discoverable by agents.
- `PAUSED`: the app is temporarily hidden from agent discovery.

## Agent Listing Requirements

Publishing to the agent registry requires:

- The app audience is `AGENT` or `HYBRID`.
- The app has a clear `agentSummary`.
- At least one capability is `ACTIVE`.
- Each active capability has an endpoint URL or documentation URL.
- Each active capability has input and output schemas.
- Each active capability has safety notes.

These requirements prevent vague “AI-ready” listings from entering the registry.

## Capability Model

Agents discover capabilities, not generic app pages. A capability describes one machine-usable action or data surface:

- `name`
- `slug`
- `description`
- `capabilityType`
- `authType`
- `endpointUrl`
- `docsUrl`
- `inputSchemaJson`
- `outputSchemaJson`
- `safetyNotes`
- `status`
- `reliabilityScore`
- `latencyP50Ms`

Capability metadata should describe what an agent can discover or request from the app. It should not imply that Cotana performs the downstream action.

Compatibility metadata lets outside agents self-select usable surfaces:

- `authType`: how the downstream app expects access.
- `interfaceType`: which technical surface the app exposes.
- `interactionMode`: whether the capability is read-only, write-capable, transactional, or requires human handoff.

The default safe registry posture is `READ_ONLY`. Write and transactional modes should remain hidden from published discovery until Cotana has explicit policy and safety review around them.

## Registry APIs

The public registry exposes discovery data only:

- `GET /.well-known/cotana-agent-registry`
- `GET /api/agent-registry`
- `GET /api/agent-registry/[slug]`
- `GET /api/agent-registry/[slug]/capabilities/[capabilitySlug]`
- `GET /api/agent-registry/search?q=...`
- `GET /api/agent-registry/schema`
- `GET /api/agent-registry/categories`
- `GET /api/agent-registry/capabilities`
- `GET /api/agent-registry/compatibility`
- `GET /api/agent-registry/policy`
- `GET /api/agent-registry/stats`
- `GET /llms.txt`

The manifest includes a trust boundary block:

```json
{
  "purpose": "discovery",
  "trustBoundary": {
    "cotanaRole": "DISCOVERY_ONLY",
    "execution": "EXTERNAL_APP",
    "credentialHandling": "NOT_HANDLED_BY_COTANA"
  }
}
```

## Ranking Direction

Human search ranks apps. Agent search ranks matched capabilities attached to apps.

Human ranking can use semantic relevance, reviews, likes, views, category signals, shelves, trending, and rising scores. Agent ranking should add capability match, schema completeness, auth friction, reliability, latency, and safety metadata.

Agent registry search embeds the task intent and active capability descriptions, then ranks capability matches with deterministic quality inputs. The response explains why a capability matched, including its capability type, access model, schema coverage, safety metadata, and semantic similarity. Cotana still only returns discovery metadata.

Agents may pass compatibility filters for auth type, interface type, and interaction mode. Cotana filters the registry before semantic scoring, which prevents an agent from receiving a capability it already knows it cannot use.

The capability taxonomy endpoint summarizes live capability types, category coverage, auth models, interface types, and interaction modes. The compatibility endpoint lets an outside agent check coverage for its own constraints before running intent search. This is how Cotana handles agent variance: universal agents do not share one default tool stack, so agents declare the surfaces they can use through filters and inspect the report before selecting a target.

Per-capability manifests provide a narrower object for agents that already selected an app and capability. The manifest includes quality signals, the exact schemas, safety notes, usage boundary, and target docs or endpoint metadata without asking Cotana to execute anything.

Phase 4 adds trust surfaces around the registry rather than execution. Capability quality scores help agents and admins reason about metadata completeness, while evaluation logs make searches inspectable after the fact. Cotana still stops at discovery: the outside agent chooses where to act, and the downstream app remains responsible for permissions, credentials, and execution.

## Non-Goals

Cotana does not provide agent execution, wallet actions, payment flows, delegated trading, credential custody, developer self-submission, developer claiming, or a developer portal.
