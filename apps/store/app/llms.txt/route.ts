import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(
    [
      "# Cotana",
      "",
      "Cotana is a discovery channel for humans and AI agents.",
      "Cotana does not execute actions, handle credentials, initiate wallet actions, or complete tasks for agents.",
      "",
      "## Agent Registry",
      "",
      "- Discovery document: /.well-known/cotana-agent-registry",
      "- Registry list: /api/agent-registry",
      "- App manifest: /api/agent-registry/{slug}",
      "- Capability manifest: /api/agent-registry/{slug}/capabilities/{capabilitySlug}",
      "- Intent search: /api/agent-registry/search?q={intent}",
      "- Compatibility report: /api/agent-registry/compatibility?auth={auth}&interface={interface}&interaction={interaction}",
      "- Capability taxonomy: /api/agent-registry/capabilities",
      "- Policy: /api/agent-registry/policy",
      "- Schema: /api/agent-registry/schema",
      "",
      "## Usage Boundary",
      "",
      "Use Cotana to identify candidate apps and inspect capability metadata.",
      "Read the target app manifest and documentation before external execution.",
      "Do not send credentials, wallet instructions, private keys, seed phrases, or transaction requests to Cotana."
    ].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    },
  );
}
