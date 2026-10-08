import assert from "node:assert/strict";
import test from "node:test";
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
import {
  UGP_10_33_RECEIVER_VERSION,
} from "./authority-outreach-ugp-10-33-certification.js";

function databaseUrl():string|null{
  const raw=process.env.UGP_10_33_EPHEMERAL_DATABASE_URL?.trim();
  if(!raw) return null;
  const parsed=new URL(raw);
  if(!["127.0.0.1","localhost"].includes(parsed.hostname)){
    throw new Error("ugp10_33_ephemeral_database_must_be_localhost");
  }
  if(parsed.pathname.replace(/^\//,"")!=="seo_engine_test"){
    throw new Error("ugp10_33_ephemeral_database_name_invalid");
  }
  return raw;
}

test("UGP-10.33 PostgreSQL certification is one-attempt, replay-safe, and suppression-aware",async(t)=>{
  const url=databaseUrl();
  if(!url){
    t.skip("UGP_10_33_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const sourceCommitSha="b".repeat(40);
  const receiverUrl=
    "https://ugp-10-33-db-ci.up.railway.app/ugp-10-33/receive";
  const built=buildUgp1033ControlledCertificationFixture({
    sourceCommitSha,
    receiverUrl,
  });
  const admin=postgres(url,{max:2,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await admin.end({timeout:1}).catch(()=>undefined);});

  const safetyStore=new AuthorityOutreachOutboundSafetyStore({databaseUrl:url});
  const reserved=await safetyStore.reserve({
    intent:built.safetyIntent,
    intentInput:built.safetyIntentInput,
    actorId:"operator@example.com",
  });
  assert.equal(reserved.kind,"created");

  let calls=0;
  const fetchImpl=async()=>{
    calls+=1;
    return new Response(JSON.stringify({
      version:UGP_10_33_RECEIVER_VERSION,
      accepted:true,
      executionFingerprint:built.executionIntent.executionFingerprint,
      payloadFingerprint:built.executionIntent.payloadFingerprint,
      receiptFingerprint:"c".repeat(64),
    }),{status:200,headers:{"content-type":"application/json"}});
  };

  const first=await executeUgp1033ControlledCertification({
    databaseUrl:url,
    sourceCommitSha,
    receiverUrl,
    authorizationLiteral:built.plan.authorizationLiteral,
    reservationId:built.safetyIntent.reservationId,
    reservationFingerprint:built.safetyIntent.reservationFingerprint,
    payload:built.payload,
    actorId:"operator@example.com",
    fetchImpl,
  });
  assert.equal(first.disposition,"accepted");
  assert.equal(first.networkCalls,1);
  assert.equal(first.messageTransmissionAttempted,true);
  assert.equal(first.messageTransmissionAccepted,true);
  assert.equal(calls,1);

  const replay=await executeUgp1033ControlledCertification({
    databaseUrl:url,
    sourceCommitSha,
    receiverUrl,
    authorizationLiteral:built.plan.authorizationLiteral,
    reservationId:built.safetyIntent.reservationId,
    reservationFingerprint:built.safetyIntent.reservationFingerprint,
    payload:built.payload,
    actorId:"operator@example.com",
    fetchImpl,
  });
  assert.equal(replay.disposition,"existing_accepted");
  assert.equal(replay.networkCalls,0);
  assert.equal(calls,1);

  const execution=await admin.unsafe<{
    state:string;
    attempt_count:number;
    adapter_class:string;
  }[]>(
    "SELECT state,attempt_count,adapter_class FROM authority_outreach_single_send_executions WHERE reservation_id=$1",
    [built.safetyIntent.reservationId],
  );
  assert.deepEqual(Array.from(execution),[{
    state:"accepted",
    attempt_count:1,
    adapter_class:"controlled_https_cert",
  }]);

  const events=await admin.unsafe<{event_type:string;event_reason:string}[]>(
    "SELECT event_type,event_reason FROM authority_outreach_single_send_execution_events WHERE execution_id=$1 ORDER BY sequence",
    [first.executionId],
  );
  assert.deepEqual(Array.from(events),[
    {event_type:"claimed",event_reason:"execution_preflight_passed"},
    {event_type:"accepted",event_reason:"controlled_https_cert_accepted"},
  ]);

  await safetyStore.suppress({
    ownedSiteDomain:built.safetyIntent.ownedSiteDomain,
    recipientDomain:built.safetyIntent.recipientDomain,
    contactPointFingerprint:built.safetyIntent.selectedContactPointFingerprint,
    reasonCode:"manual_suppression",
    actorId:"operator@example.com",
  });
  const blocked=await safetyStore.reserve({
    intent:built.safetyIntent,
    intentInput:built.safetyIntentInput,
    actorId:"operator@example.com",
  });
  assert.equal(blocked.kind,"suppressed_contact");
});
