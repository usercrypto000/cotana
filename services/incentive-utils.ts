import type { IncentiveLink, ProjectLink } from "@prisma/client";

export const normalizeList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const computeVerified = (
  incentiveLinks: IncentiveLink[],
  projectLinks: ProjectLink[]
) => {
  const tier1 = [...incentiveLinks, ...projectLinks].filter(
    (link) => link.tier === "TIER1"
  );
  if (tier1.length >= 1) {
    return true;
  }
  const tier2 = [...incentiveLinks, ...projectLinks].filter(
    (link) => link.tier === "TIER2"
  );
  return tier2.length >= 2;
};

export const applyIncentiveUpdate = (payload: Record<string, unknown>) => {
  const data: Record<string, unknown> = {};

  if (typeof payload.verified === "boolean") {
    data.verified = payload.verified;
  }
  if (typeof payload.status === "string") {
    data.status = payload.status;
  }
  if (typeof payload.saturationScore === "number") {
    data.saturationScore = payload.saturationScore;
  }
  if (typeof payload.riskScore === "number") {
    data.riskScore = payload.riskScore;
  }
  if (typeof payload.roiLabel === "string") {
    data.roiLabel = payload.roiLabel;
  }
  if (typeof payload.effortLabel === "string") {
    data.effortLabel = payload.effortLabel;
  }
  if (typeof payload.flowSummary === "string") {
    data.flowSummary = payload.flowSummary;
  }
  if (typeof payload.statusRationale === "string") {
    data.statusRationale = payload.statusRationale;
  }

  return data;
};
