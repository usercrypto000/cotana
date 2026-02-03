import "dotenv/config";
import { runSaturationSync } from "../services/saturation-sync";

runSaturationSync()
  .then((result) => {
    console.log("[saturation-sync]", result);
  })
  .catch((err) => {
    console.error("[saturation-sync] failed", err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
