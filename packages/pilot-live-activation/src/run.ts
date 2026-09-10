import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runActivationFromEnvironment, serializedActivationEvidence } from "./runner.js";

const evidence = await runActivationFromEnvironment(process.env);
const output = serializedActivationEvidence(evidence);
process.stdout.write(output);

const evidencePath = process.env.SEO_ENGINE_ACTIVATION_EVIDENCE_PATH?.trim();
if (evidencePath) {
  await writeFile(resolve(evidencePath), output, { encoding: "utf8", mode: 0o600 });
}

process.exitCode = evidence.readOnlyReady ? 0 : 2;
