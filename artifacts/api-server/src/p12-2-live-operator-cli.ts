import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  boundedP122L3ErrorCode,
  executeP122L3LiveOperator,
  p122L3LiveOperatorCapability,
  type P122L3OperatorEnvelope,
} from "./lib/p12-2-l6-3-live-operator.js";

function envelopePathFromArgs(args: string[]): string | null {
  const index = args.indexOf("--envelope");
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error("p12_2_l6_3_envelope_path_required");
  const allowed = new Set(["--execute", "--envelope", value]);
  if (args.some((arg) => !allowed.has(arg))) throw new Error("p12_2_l6_3_cli_argument_invalid");
  if (args.filter((arg) => arg === "--envelope").length !== 1) throw new Error("p12_2_l6_3_cli_argument_invalid");
  return resolve(value);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({
      status: "inspection_only",
      capability: p122L3LiveOperatorCapability(),
    }));
    return;
  }

  const envelopePath = envelopePathFromArgs(args);
  if (!envelopePath) throw new Error("p12_2_l6_3_envelope_path_required");
  const authorizationLiteral = process.env.P12_2_L2_AUTHORIZATION_LITERAL?.trim() ?? "";
  if (!authorizationLiteral) throw new Error("p12_2_l6_3_authorization_literal_required");
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) throw new Error("p12_2_l6_3_database_url_required");

  const raw = await readFile(envelopePath, "utf8");
  if (Buffer.byteLength(raw, "utf8") > 8_000_000) throw new Error("p12_2_l6_3_envelope_too_large");
  let envelope: P122L3OperatorEnvelope;
  try {
    envelope = JSON.parse(raw) as P122L3OperatorEnvelope;
  } catch {
    throw new Error("p12_2_l6_3_envelope_json_invalid");
  }

  const receipt = await executeP122L3LiveOperator({ envelope, authorizationLiteral, databaseUrl });
  console.log(JSON.stringify({
    status: "completed",
    packetFingerprint: receipt.packetFingerprint,
    phase: receipt.phase,
    runId: receipt.runId,
    invocationAttempt: receipt.invocationAttempt,
    automaticRetryPerformed: receipt.automaticRetryPerformed,
    result: receipt.result,
    receiptFingerprint: receipt.fingerprint,
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    status: "failed",
    code: boundedP122L3ErrorCode(error),
  }));
  process.exitCode = 2;
});
