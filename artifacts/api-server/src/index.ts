import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (process.env.DATABASE_URL?.trim()) {
  const { ensureDiamondShelfIdentity } = await import("@workspace/db");
  const identity = await ensureDiamondShelfIdentity();
  logger.info({ status: identity.status, tableCount: identity.tableCount, reason: identity.reason ?? undefined }, "Diamond Shelf identity check");
} else {
  logger.info({ status: "blocked", reason: "DATABASE_URL is not configured." }, "Diamond Shelf identity check");
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  if (process.env.DATABASE_URL?.trim()) {
    void import("./lib/pilot-orchestration")
      .then(({ resumeQueuedPilots }) => resumeQueuedPilots())
      .catch(() => undefined);
  }
});
