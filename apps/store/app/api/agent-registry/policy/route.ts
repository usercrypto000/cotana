import { analyticsEvents, trackServerEvent } from "@cotana/analytics";
import { NextResponse } from "next/server";
import { getRequestIdentity } from "../../../../lib/request";

export async function GET(request: Request) {
  void trackServerEvent({
    event: analyticsEvents.agentRegistryPolicyViewed,
    distinctId: getRequestIdentity(request)
  });

  return NextResponse.json({
    version: "2026-05-07",
    purpose: "discovery",
    policy: {
      cotanaRole: "Cotana helps agents discover compatible apps and capabilities.",
      execution: "Cotana does not execute downstream app actions.",
      credentials: "Cotana does not receive, store, proxy, or issue app-specific credentials.",
      walletActions: "Cotana does not initiate wallet actions, transactions, signatures, or delegated trading.",
      listingEligibility: [
        "The app is published in Cotana.",
        "The app audience is AGENT or HYBRID.",
        "The agent listing is published.",
        "At least one active capability has schemas, safety notes, and docs or endpoint metadata."
      ],
      publishedDefault: "Published registry capabilities should be READ_ONLY until explicit policy support expands.",
      agentResponsibility:
        "Outside agents must inspect the returned manifest and target app documentation before any external execution."
    },
    trustBoundary: {
      cotanaRole: "DISCOVERY_ONLY",
      execution: "EXTERNAL_APP",
      credentialHandling: "NOT_HANDLED_BY_COTANA"
    }
  });
}
