export async function GET() {
  return Response.json({
    note: "Read-only example payload for downstream integrations.",
    delivery_guarantee: "none (example only)",
    event: "incident.updated",
    apiVersion: "v1",
    incident: {
      id: "123456",
      permalink: "/incidents/123456",
      taxonomyLabel: "Protocol Exploit",
      incidentType: "PROTOCOL_EXPLOIT",
      chainId: 1,
      chain: "Ethereum",
      score: 88,
      confidence: 0.92,
      estimatedLossUsd: 12500000,
      historical: false,
      detectedVia: "realtime",
      lastUpdatedAt: "2026-02-06T12:00:00.000Z",
    },
  });
}

