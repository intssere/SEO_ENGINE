import assert from "node:assert/strict";
import test from "node:test";
import { GetPilotAuthorizationResponse, GetPilotStatusResponse, StartPilotRunResponse } from "@workspace/api-zod";

test("pilot API contracts accept queued, running, completed, partial, and failed states", () => {
  assert.equal(GetPilotAuthorizationResponse.parse({ authorization: "signed-capability" }).authorization, "signed-capability");
  for (const status of ["not_started", "queued", "running", "completed", "partial", "failed"] as const) {
    const parsed = GetPilotStatusResponse.parse({
      runId: status === "not_started" ? null : "run",
      status,
      phase: status,
      readiness: status === "partial" ? "partial" : status === "completed" ? "ready" : "not_evaluated",
      freshness: null,
      blockers: [],
      counts: { products: 0, gscRows: 0, ga4Rows: 0, pages: 0, findings: 0, opportunities: 0 },
      error: status === "failed" ? "pilot_internal_failure" : null,
    });
    assert.equal(parsed.status, status);
  }
  assert.equal(StartPilotRunResponse.parse({ accepted: true, runId: "run", status: "queued", error: null }).status, "queued");
});