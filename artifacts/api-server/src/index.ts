import app from "./app";
import { logger } from "./lib/logger";
import { createProductionBindingSupplier } from "./lib/p8-8-w09c2e-r2-production-composition.js";
import { loadStartupRuntimeConfig } from "./lib/startup-runtime.js";

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

const databaseBinding = process.env.DATABASE_URL;
export const productionBindingSupplier =
  createProductionBindingSupplier(databaseBinding);

if (databaseBinding?.trim()) {
  const { ensureDiamondShelfIdentity } = await import("@workspace/db");
  const identity = await ensureDiamondShelfIdentity();
  logger.info(
    {
      status: identity.status,
      tableCount: identity.tableCount,
      reason: identity.reason ?? undefined,
    },
    "Diamond Shelf identity check",
  );
  if (identity.status !== "ready") {
    throw new Error(
      `Database identity verification blocked startup: ${identity.reason ?? "unknown reason"}`,
    );
  }
} else {
  logger.info(
    { status: "blocked", reason: "DATABASE_URL is not configured." },
    "Diamond Shelf identity check",
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  const startup = loadStartupRuntimeConfig();
  if (startup.pilotQueueResumeEnabled) {
    void import("./lib/pilot-orchestration")
      .then(({ resumeQueuedPilots }) => resumeQueuedPilots())
      .catch(() => undefined);
  } else {
    logger.info(
      {
        databaseConfigured: startup.databaseConfigured,
        pilotQueueResumeEnabled: false,
      },
      "Pending legacy pilot queue resume disabled",
    );
  }
});
