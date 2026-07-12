import React from "react";
import { Badge, TrustBadge } from "@cotana/ui";

export function AppTrustBadges({
  verified,
  communityPick
}: {
  verified: boolean;
  communityPick: boolean;
}) {
  if (!verified && !communityPick) {
    return null;
  }

  return (
    <>
      {verified ? <TrustBadge tone="verified">Verified</TrustBadge> : null}
      {communityPick ? <Badge variant="secondary">Community pick</Badge> : null}
    </>
  );
}
