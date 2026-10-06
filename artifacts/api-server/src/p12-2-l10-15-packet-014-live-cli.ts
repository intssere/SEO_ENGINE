import {
  boundedP122L3ErrorCode,
  executeP122L3LiveOperator,
} from "./lib/p12-2-l6-3-live-operator.js";
import {
  P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
  P12_2_L10_15_POSTGRES_SERVICE_ID,
  P12_2_L10_15_RUN_ID,
  p122L1015AuthorizationLiteral,
  p122L1015Capability,
  p122L1015OperatorEnvelope,
} from "./lib/p12-2-l10-15-packet-014-full-initial.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(JSON.stringify({
      status: "inspection_only",
      capability: p122L1015Capability(),
      packetFingerprint: P12_2_L10_15_EXPECTED_PACKET_FINGERPRINT,
      runId: P12_2_L10_15_RUN_ID,
      authorizationLiteral: p122L1015AuthorizationLiteral(),
    }));
    return;
  }

  if (args.length !== 1 || args[0] !== "--execute") {
    throw new Error("p12_2_l10_15_cli_argument_invalid");
  }

  const authorizationLiteral =
    process.env.P12_2_L2_AUTHORIZATION_LITERAL?.trim() ?? "";
  if (authorizationLiteral !== p122L1015AuthorizationLiteral()) {
    throw new Error("p12_2_l10_15_authorization_literal_invalid");
  }

  const postgresServiceId =
    process.env.P12_2_L10_15_POSTGRES_SERVICE_ID?.trim() ?? "";
  if (postgresServiceId !== P12_2_L10_15_POSTGRES_SERVICE_ID) {
    throw new Error("p12_2_l10_15_postgres_service_binding_invalid");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (!databaseUrl) throw new Error("p12_2_l10_15_database_url_required");

  const receipt = await executeP122L3LiveOperator({
    envelope: p122L1015OperatorEnvelope(),
    authorizationLiteral,
    databaseUrl,
  });

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
