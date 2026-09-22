import {
  defaultP12_2InspectionConfig,
  inspectP12_2Manual,
  p12_2ManualCapability,
} from "./lib/first-party-crawl-manual.js";

const args = new Set(process.argv.slice(2));
if (args.has("--execute")) {
  console.error(JSON.stringify({
    status: "blocked",
    reason: "p12_2_cli_direct_execution_disabled",
    capability: p12_2ManualCapability(),
  }));
  process.exitCode = 2;
} else {
  const config = defaultP12_2InspectionConfig();
  console.log(JSON.stringify({
    status: "inspection_only",
    readiness: inspectP12_2Manual(config),
    capability: p12_2ManualCapability(),
  }));
}
