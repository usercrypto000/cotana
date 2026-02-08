import "dotenv/config";
import { logger } from "../services/logger";
import { assertIncidentWsEnv } from "../services/exploit-tracker/env";
import { startIncidentWsServer } from "../services/exploit-tracker/ws-server";

async function main() {
  assertIncidentWsEnv();
  const server = await startIncidentWsServer();

  const shutdown = async () => {
    try {
      await server.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, "incident_ws_server_failed");
    process.exit(1);
  });
}
