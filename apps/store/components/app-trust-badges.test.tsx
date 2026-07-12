import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppTrustBadges } from "./app-trust-badges";

describe("AppTrustBadges", () => {
  it("renders both public trust badges when enabled", () => {
    const markup = renderToStaticMarkup(<AppTrustBadges verified communityPick />);

    expect(markup).toContain("Verified");
    expect(markup).toContain("Community pick");
  });

  it("renders nothing when no trust badges apply", () => {
    const markup = renderToStaticMarkup(<AppTrustBadges verified={false} communityPick={false} />);

    expect(markup).toBe("");
  });
});
