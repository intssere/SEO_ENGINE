import postgres from "postgres";
import {
  AuthorityOutreachOutboundSafetyStore,
} from "./authority-outreach-outbound-safety-store.js";
import {
  executeUgp1033ControlledCertification,
} from "./authority-outreach-ugp-10-33-executor.js";
import {
  buildUgp1033ControlledCertificationFixture,
} from "./authority-outreach-ugp-10-33-fixture.js";

if(process.env.NODE_ENV==="production"){
  throw new Error("ugp10_33_production_live_certification_forbidden");
}
if(process.env.UGP_10_33_REAL_CERT_ENABLED?.trim().toLowerCase()!=="true"){
  throw new Error("ugp10_33_real_certification_disabled");
}

const databaseUrl=process.env.DATABASE_URL?.trim()??"";
const sourceCommitSha=process.env.UGP_10_33_SOURCE_COMMIT_SHA?.trim()??"";
const receiverUrl=process.env.UGP_10_33_CERT_RECEIVER_URL?.trim()??"";
const authorizationLiteral=process.env.UGP_10_33_AUTHORIZATION_LITERAL?.trim()??"";
if(!databaseUrl||!sourceCommitSha||!receiverUrl||!authorizationLiteral){
  throw new Error("ugp10_33_live_certification_inputs_required");
}

const built=buildUgp1033ControlledCertificationFixture({
  sourceCommitSha,
  receiverUrl,
});
if(authorizationLiteral!==built.plan.authorizationLiteral){
  throw new Error("ugp10_33_exact_authorization_literal_required");
}

const sql=postgres(databaseUrl,{max:2,prepare:false,connect_timeout:10,idle_timeout:2});
try{
  const tableCount=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  if(Number(tableCount[0]?.count??0)!==49){
    throw new Error("ugp10_33_cert_database_not_49_table_state");
  }

  const safetyStore=new AuthorityOutreachOutboundSafetyStore({databaseUrl});
  const reserved=await safetyStore.reserve({
    intent:built.safetyIntent,
    intentInput:built.safetyIntentInput,
    actorId:"operator@example.com",
  });
  if(
    reserved.kind!=="created"
    &&reserved.kind!=="existing_reserved"
    &&reserved.kind!=="already_consumed"
  ){
    throw new Error("ugp10_33_cert_reservation_not_available:"+reserved.kind);
  }

  const first=await executeUgp1033ControlledCertification({
    databaseUrl,
    sourceCommitSha,
    receiverUrl,
    authorizationLiteral,
    reservationId:built.safetyIntent.reservationId,
    reservationFingerprint:built.safetyIntent.reservationFingerprint,
    payload:built.payload,
    actorId:"operator@example.com",
  });
  if(
    first.disposition!=="accepted"
    &&first.disposition!=="existing_accepted"
  ){
    throw new Error("ugp10_33_real_submission_not_accepted:"+first.disposition);
  }

  const replay=await executeUgp1033ControlledCertification({
    databaseUrl,
    sourceCommitSha,
    receiverUrl,
    authorizationLiteral,
    reservationId:built.safetyIntent.reservationId,
    reservationFingerprint:built.safetyIntent.reservationFingerprint,
    payload:built.payload,
    actorId:"operator@example.com",
  });
  if(replay.disposition!=="existing_accepted"||replay.networkCalls!==0){
    throw new Error("ugp10_33_replay_not_fenced");
  }

  const executions=await sql.unsafe<{
    state:string;
    attempt_count:number;
    adapter_class:string;
    adapter_receipt_fingerprint:string|null;
  }[]>(
    "SELECT state,attempt_count,adapter_class,adapter_receipt_fingerprint FROM authority_outreach_single_send_executions WHERE reservation_id=$1",
    [built.safetyIntent.reservationId],
  );
  if(
    executions.length!==1
    ||executions[0]?.state!=="accepted"
    ||Number(executions[0]?.attempt_count)!==1
    ||executions[0]?.adapter_class!=="controlled_https_cert"
    ||!executions[0]?.adapter_receipt_fingerprint
  ){
    throw new Error("ugp10_33_durable_execution_evidence_invalid");
  }

  const events=await sql.unsafe<{event_type:string;event_reason:string}[]>(
    "SELECT event_type,event_reason FROM authority_outreach_single_send_execution_events WHERE execution_id=$1 ORDER BY sequence",
    [first.executionId],
  );
  if(
    events.length!==2
    ||events[0]?.event_type!=="claimed"
    ||events[0]?.event_reason!=="execution_preflight_passed"
    ||events[1]?.event_type!=="accepted"
    ||events[1]?.event_reason!=="controlled_https_cert_accepted"
  ){
    throw new Error("ugp10_33_execution_event_history_invalid");
  }

  const reservation=await sql.unsafe<{status:string}[]>(
    "SELECT status FROM authority_outreach_send_reservations WHERE reservation_id=$1",
    [built.safetyIntent.reservationId],
  );
  if(reservation[0]?.status!=="consumed"){
    throw new Error("ugp10_33_reservation_not_consumed");
  }

  const contactRate=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM authority_outreach_send_reservations WHERE selected_contact_point_fingerprint=$1 AND reserved_at>transaction_timestamp()-interval '7 days'",
    [built.safetyIntent.selectedContactPointFingerprint],
  );
  const domainRate=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM authority_outreach_send_reservations WHERE recipient_domain=$1 AND reserved_at>transaction_timestamp()-interval '24 hours'",
    [built.safetyIntent.recipientDomain],
  );
  if(Number(contactRate[0]?.count??0)!==1||Number(domainRate[0]?.count??0)!==1){
    throw new Error("ugp10_33_rate_state_evidence_invalid");
  }

  await safetyStore.suppress({
    ownedSiteDomain:built.safetyIntent.ownedSiteDomain,
    recipientDomain:built.safetyIntent.recipientDomain,
    contactPointFingerprint:built.safetyIntent.selectedContactPointFingerprint,
    reasonCode:"manual_suppression",
    actorId:"operator@example.com",
  });
  const suppressedReplay=await safetyStore.reserve({
    intent:built.safetyIntent,
    intentInput:built.safetyIntentInput,
    actorId:"operator@example.com",
  });
  if(suppressedReplay.kind!=="suppressed_contact"){
    throw new Error("ugp10_33_post_send_suppression_not_enforced");
  }

  process.stdout.write(JSON.stringify({
    version:"ugp-10-33-controlled-real-web-submission-certification-v1",
    pass:true,
    sourceCommitSha,
    receiverDomain:built.plan.receiverDomain,
    planFingerprint:built.plan.planFingerprint,
    reservationId:built.safetyIntent.reservationId,
    reservationFingerprint:built.safetyIntent.reservationFingerprint,
    executionId:first.executionId,
    executionFingerprint:first.executionFingerprint,
    adapterReceiptFingerprint:executions[0].adapter_receipt_fingerprint,
    firstDisposition:first.disposition,
    networkCallsThisInvocation:first.networkCalls,
    replayDisposition:replay.disposition,
    replayNetworkCalls:replay.networkCalls,
    durableAttemptCount:1,
    executionEventTypes:events.map(row=>row.event_type),
    executionEventReasons:events.map(row=>row.event_reason),
    reservationStatus:"consumed",
    contactRateCount7d:Number(contactRate[0]?.count??0),
    recipientDomainRateCount24h:Number(domainRate[0]?.count??0),
    suppressionReplay:"suppressed_contact",
    automaticRetryPerformed:false,
    productionMutation:false,
  },null,2)+"\n");
}finally{
  await sql.end({timeout:1}).catch(()=>undefined);
}
