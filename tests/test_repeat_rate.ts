import assert from "assert";
import { computeRepeatRate } from "../services/mindshare_metrics_helpers";

function testRepeatRate() {
  const data = new Map<string, { days: Set<string> }>();
  data.set("0x1", { days: new Set(["2026-01-01"]) });
  data.set("0x2", { days: new Set(["2026-01-01", "2026-01-02"]) });
  data.set("0x3", { days: new Set(["2026-01-01", "2026-01-02", "2026-01-03"]) });
  const rate = computeRepeatRate(data);
  assert.strictEqual(rate, 2 / 3);
  console.log("repeatRate test passed");
}

testRepeatRate();
