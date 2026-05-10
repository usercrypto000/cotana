import React from "react";
import { Badge } from "@cotana/ui";

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
      {verified ? <Badge variant="verified">Verified</Badge> : null}
      {communityPick ? <Badge variant="secondary">Community pick</Badge> : null}
    </>
  );
}
