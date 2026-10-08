import { buildUgp1033ControlledCertificationFixture } from "./authority-outreach-ugp-10-33-fixture.js";

const sourceCommitSha=process.env.UGP_10_33_SOURCE_COMMIT_SHA?.trim()??"";
const receiverUrl=process.env.UGP_10_33_CERT_RECEIVER_URL?.trim()??"";
if(!sourceCommitSha||!receiverUrl){
  throw new Error("ugp10_33_plan_inputs_required");
}
const built=buildUgp1033ControlledCertificationFixture({
  sourceCommitSha,
  receiverUrl,
});
process.stdout.write(JSON.stringify({
  version:built.plan.version,
  sourceCommitSha:built.plan.sourceCommitSha,
  receiverUrl:built.plan.receiverUrl,
  receiverDomain:built.plan.receiverDomain,
  reservationId:built.safetyIntent.reservationId,
  reservationFingerprint:built.safetyIntent.reservationFingerprint,
  executionFingerprint:built.executionIntent.executionFingerprint,
  payloadFingerprint:built.executionIntent.payloadFingerprint,
  planFingerprint:built.plan.planFingerprint,
  authorizationLiteral:built.plan.authorizationLiteral,
  maxCalls:built.plan.maxCalls,
  maxAttemptsPerCall:built.plan.maxAttemptsPerCall,
  automaticRetry:built.plan.automaticRetry,
},null,2)+"\n");
