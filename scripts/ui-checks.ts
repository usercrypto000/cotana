import assert from "node:assert/strict";
import { formatRewardLabel, getCardSummary, isExternalUrl } from "../app/incentives/utils";

const run = () => {
  assert.equal(isExternalUrl("https://example.com"), true);
  assert.equal(isExternalUrl("/incentives"), false);

  assert.equal(getCardSummary("Short summary"), "Short summary");
  assert.equal(getCardSummary("   "), "No summary provided.");

  assert.equal(formatRewardLabel("POINTS", null), "Points");
  assert.equal(formatRewardLabel("TOKEN", "ENSO"), "Token • ENSO");
  assert.equal(formatRewardLabel("FEES", null), "Fees");
};

run();
console.log("ui-checks: ok");
