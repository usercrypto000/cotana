import * as React from "react";
import { Badge, type BadgeProps } from "./badge";

const toneToVariant = {
  verified: "verified",
  ready: "ready",
  warning: "warning",
  danger: "danger",
  agent: "agent"
} as const satisfies Record<string, NonNullable<BadgeProps["variant"]>>;

export type TrustBadgeTone = keyof typeof toneToVariant;

export type TrustBadgeProps = Omit<BadgeProps, "variant"> & {
  tone: TrustBadgeTone;
};

export function TrustBadge({ tone, ...props }: TrustBadgeProps) {
  return <Badge variant={toneToVariant[tone]} {...props} />;
}
