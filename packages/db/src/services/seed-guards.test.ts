import { describe, expect, it } from "vitest";
import { reviewBodyMinimumLength, seededReviewBodies } from "./seed-fixtures";
import { assertSeedFixturesAllowed, assertStagingSeedAllowed } from "./seed-guards";

describe("seed workflow guards", () => {
  it("prevents fixture insertion in production", () => {
    expect(() =>
      assertSeedFixturesAllowed({
        NODE_ENV: "production",
        COTANA_SEED_LAUNCH_CATALOG: "true"
      } as NodeJS.ProcessEnv),
    ).toThrow("disabled in production");
  });

  it("requires explicit staging confirmation", () => {
    expect(() =>
      assertStagingSeedAllowed({
        NODE_ENV: "development"
      } as NodeJS.ProcessEnv),
    ).toThrow("COTANA_STAGING_SEED_CONFIRM");

    expect(() =>
      assertStagingSeedAllowed({
        NODE_ENV: "development",
        COTANA_STAGING_SEED_CONFIRM: "true"
      } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("keeps seeded public review bodies above the database constraint", () => {
    expect(seededReviewBodies.length).toBeGreaterThan(0);

    for (const body of seededReviewBodies) {
      expect(body.length).toBeGreaterThanOrEqual(reviewBodyMinimumLength);
    }
  });
});
