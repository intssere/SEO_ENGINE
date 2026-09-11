import { bootstrapRuntimeDatabase } from "./runtime-bootstrap.js";

const result = await bootstrapRuntimeDatabase();
const safe = {
  status: result.status,
  migrationApplied: result.migrationApplied,
  tableCount: result.tableCount,
  domain: result.domain ?? null,
  organizationId: result.organizationId ?? null,
  siteId: result.siteId ?? null,
  reason: result.reason ?? null,
};

process.stdout.write(`${JSON.stringify(safe, null, 2)}\n`);
if (result.status !== "ready") process.exitCode = 1;
