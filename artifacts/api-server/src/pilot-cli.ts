import { runProductionPilot } from "./lib/pilot-runner";

runProductionPilot()
  .then((result) => {
    console.log(JSON.stringify({
      status: result.status,
      readiness: result.readiness.state,
      blockers: result.readiness.blockers,
      counts: result.counts,
    }));
  })
  .catch((error) => {
    console.error(JSON.stringify({ status: "failed", category: error instanceof Error ? error.message : "pilot_failed" }));
    process.exitCode = 1;
  });