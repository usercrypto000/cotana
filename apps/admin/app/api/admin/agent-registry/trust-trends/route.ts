import { isAdminUser } from "@cotana/auth/authorization";
import {
  listAppTrustSignalTrend,
  listCapabilityQualityTrend,
  listDiscoveryScoreTrend,
  listMissingMetadataTrend,
  listSignalAvailabilityTrend
} from "@cotana/db";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "../../../../../lib/session";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!isAdminUser(sessionUser)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appId = request.nextUrl.searchParams.get("appId") ?? undefined;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 20), 1), 80);
  const [capabilityQuality, appTrustSignals, discoveryScores, signalAvailability, missingMetadata] =
    await Promise.all([
      listCapabilityQualityTrend(limit),
      listAppTrustSignalTrend(appId, limit),
      listDiscoveryScoreTrend(appId, limit),
      listSignalAvailabilityTrend(limit),
      listMissingMetadataTrend()
    ]);

  return NextResponse.json({
    purpose: "internal_trust_trend_preview",
    noExecution: true,
    capabilityQuality,
    appTrustSignals,
    discoveryScores,
    signalAvailability,
    missingMetadata
  });
}
