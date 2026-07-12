import { describe, expect, it } from "vitest";
import { cotanaDeploymentTargets, getVercelProjectForApp } from "./deployment";

describe("deployment targets", () => {
  it("pins production store to cotana.xyz and the cotana GitHub repo", () => {
    expect(cotanaDeploymentTargets.githubRepository).toBe("usercrypto000/cotana");
    expect(getVercelProjectForApp("store")).toMatchObject({
      projectName: "cotana",
      productionUrl: "https://cotana.xyz"
    });
  });

  it("keeps admin on the protected admin project", () => {
    expect(getVercelProjectForApp("admin")).toMatchObject({
      projectName: "cotana-admin",
      productionUrl: "https://cotana-admin.vercel.app"
    });
  });
});
