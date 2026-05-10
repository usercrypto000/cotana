import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getAgentRegistryCapabilityManifest } from "@cotana/db";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../../../lib/request";

type Params = {
  params: Promise<{
    slug: string;
    capabilitySlug: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug, capabilitySlug } = await params;
  const manifest = await getAgentRegistryCapabilityManifest(slug, capabilitySlug);

  if (!manifest) {
    return NextResponse.json({ error: "Agent capability manifest not found." }, { status: 404 });
  }

  void trackServerEvent({
    event: analyticsEvents.agentRegistryCapabilityViewed,
    distinctId: getRequestIdentity(request),
    properties: {
      slug,
      capabilitySlug,
      appId: manifest.app.id,
      capabilityId: manifest.capability.id
    }
  });

  return NextResponse.json(manifest);
}
