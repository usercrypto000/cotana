import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { getAgentRegistryManifest } from "@cotana/db";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const manifest = await getAgentRegistryManifest(slug);

  if (!manifest) {
    return NextResponse.json({ error: "Agent manifest not found." }, { status: 404 });
  }

  void trackServerEvent({
    event: analyticsEvents.agentRegistryManifestViewed,
    distinctId: getRequestIdentity(request),
    properties: {
      slug,
      appId: manifest.app.id
    }
  });

  return NextResponse.json(manifest);
}
