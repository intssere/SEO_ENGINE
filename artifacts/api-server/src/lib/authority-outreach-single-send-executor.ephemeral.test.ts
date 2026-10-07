import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {
  AuthorityOutreachOutboundSafetyStore,
} from "./authority-outreach-outbound-safety-store.js";
import {
  buildAuthorityOutreachOutboundSafetyIntent,
} from "./authority-outreach-outbound-safety-intent.js";
import {
  authorityOutreachPublicContactPointFingerprint,
} from "./authority-outreach-contact-point-evidence-validation.js";
import {
  authorityOutreachDraftCandidateFingerprint,
} from "./authority-outreach-draft-candidate-validation.js";
import {
  createAuthorityOutreachMockSingleSendAdapter,
} from "./authority-outreach-single-send-adapter.js";
import {
  executeAuthorityOutreachSingleSend,
} from "./authority-outreach-single-send-executor.js";
import { buildUgp1031AuthorizationFixture } from "./authority-outreach-ugp-10-31-test-fixture.js";

const FP=(c:string)=>c.repeat(64);

function databaseUrl():string|null{
  const raw=process.env.UGP_10_32_EPHEMERAL_DATABASE_URL?.trim();
  if(!raw) return null;
  const parsed=new URL(raw);
  if(!["127.0.0.1","localhost"].includes(parsed.hostname)){
    throw new Error("ugp10_32_ephemeral_database_must_be_localhost");
  }
  if(parsed.pathname.replace(/^\//,"")!=="seo_engine_test"){
    throw new Error("ugp10_32_ephemeral_database_name_invalid");
  }
  return raw;
}

async function seedReservation(input:{
  sql:ReturnType<typeof postgres>;
  siteId:string;
  contactValue:string;
  requestFingerprint:string;
  subject:string;
  body:string;
  reservationChar:string;
  logicalChar:string;
}){
  const sourceDomain="publisher.example.org";
  const contactPointFingerprint=authorityOutreachPublicContactPointFingerprint(
    "email_address",
    input.contactValue,
    sourceDomain,
  );
  const candidateFingerprint=authorityOutreachDraftCandidateFingerprint({
    requestFingerprint:input.requestFingerprint,
    subject:input.subject,
    body:input.body,
  });
  const reservationFingerprint=FP(input.reservationChar);
  const reservationId="uaosr-"+reservationFingerprint.slice(0,24);
  await input.sql.unsafe(
    "INSERT INTO authority_outreach_send_reservations(reservation_id,reservation_version,reservation_fingerprint,logical_send_key,site_id,delivery_binding_authorization_decision_fingerprint,delivery_binding_authorization_review_spec_fingerprint,prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,selected_role_candidate_fingerprint,selected_contact_point_fingerprint,send_review_fingerprint,quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at) VALUES($1,'ugp-10-31-outbound-safety-reservation-v1',$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'reserved',transaction_timestamp(),transaction_timestamp()+interval '15 minutes')",
    [
      reservationId,reservationFingerprint,FP(input.logicalChar),input.siteId,
      FP("1"),FP("2"),FP("3"),FP("4"),candidateFingerprint,
      FP("5"),contactPointFingerprint,FP("6"),FP("7"),sourceDomain,
    ],
  );
  return {
    reservationId,
    reservationFingerprint,
    payload:{
      contactPointType:"email_address" as const,
      contactPointValue:input.contactValue,
      sourceDomain,
      requestFingerprint:input.requestFingerprint,
      subject:input.subject,
      body:input.body,
    },
    contactPointFingerprint,
  };
}

test("UGP-10.32 PostgreSQL executor is one-attempt, replay-safe, uncertainty-fenced, and suppression-aware",async(t)=>{
  const url=databaseUrl();
  if(!url){
    t.skip("UGP_10_32_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const admin=postgres(url,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await admin.end({timeout:1}).catch(()=>undefined);});

  const counts=await admin.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(counts[0]?.count,49);
  const sites=await admin.unsafe<{id:string}[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1",
  );
  const siteId=sites[0]?.id;
  assert.ok(siteId);

  await t.test("full-chain accepted execution calls mock adapter exactly once and replay calls it zero times",async()=>{
    const fixture=buildUgp1031AuthorizationFixture("email_address",undefined,undefined,"f");
    const safetyIntentInput={
      deliveryBindingAuthorizationDecision:
        fixture.deliveryBindingAuthorizationDecision,
      deliveryBindingAuthorizationDecisionInput:
        fixture.deliveryBindingAuthorizationDecisionInput,
    };
    const safetyIntent=buildAuthorityOutreachOutboundSafetyIntent(safetyIntentInput);
    const safetyStore=new AuthorityOutreachOutboundSafetyStore({databaseUrl:url});
    const reserved=await safetyStore.reserve({
      intent:safetyIntent,
      intentInput:safetyIntentInput,
      actorId:"operator@example.com",
    });
    assert.equal(reserved.kind,"created");

    const payload={
      contactPointType:fixture.contactPointType,
      contactPointValue:fixture.contactPointValue,
      sourceDomain:fixture.deliveryBindingAuthorizationDecision.sourceDomain,
      requestFingerprint:fixture.request.requestFingerprint,
      subject:fixture.candidate.subject,
      body:fixture.candidate.body,
    };
    const mock=createAuthorityOutreachMockSingleSendAdapter("accepted");
    let calls=0;
    const counted={
      adapterClass:mock.adapterClass,
      networkOperationCapable:mock.networkOperationCapable,
      async send(intent:Parameters<typeof mock.send>[0]){
        calls+=1;
        return mock.send(intent);
      },
    };

    const first=await executeAuthorityOutreachSingleSend({
      databaseUrl:url,
      reservationId:safetyIntent.reservationId,
      reservationFingerprint:safetyIntent.reservationFingerprint,
      payload,
      actorId:"operator@example.com",
      adapter:counted,
    });
    assert.equal(first.disposition,"mock_accepted");
    assert.equal(first.execution.state,"accepted");
    assert.equal(first.adapterAttemptCount,1);
    assert.equal(first.networkOperationPerformed,false);
    assert.equal(first.messageTransmissionPerformed,false);
    assert.equal(calls,1);

    const replay=await executeAuthorityOutreachSingleSend({
      databaseUrl:url,
      reservationId:safetyIntent.reservationId,
      reservationFingerprint:safetyIntent.reservationFingerprint,
      payload,
      actorId:"operator@example.com",
      adapter:counted,
    });
    assert.equal(replay.disposition,"existing_accepted");
    assert.equal(replay.adapterAttemptCount,0);
    assert.equal(calls,1);

    const rows=await admin.unsafe<{state:string;attempt_count:number}[]>(
      "SELECT state,attempt_count FROM authority_outreach_single_send_executions WHERE reservation_id=$1",
      [safetyIntent.reservationId],
    );
    assert.deepEqual(Array.from(rows),[{state:"accepted",attempt_count:1}]);
    const events=await admin.unsafe<{event_type:string}[]>(
      "SELECT event_type FROM authority_outreach_single_send_execution_events WHERE execution_id=$1 ORDER BY sequence",
      [first.execution.executionId],
    );
    assert.deepEqual(Array.from(events,row=>row.event_type),["claimed","accepted"]);
    const reservation=await admin.unsafe<{status:string}[]>(
      "SELECT status FROM authority_outreach_send_reservations WHERE reservation_id=$1",
      [safetyIntent.reservationId],
    );
    assert.equal(reservation[0]?.status,"consumed");
  });

  await t.test("uncertain mock result fences replay without a second adapter call",async()=>{
    const seeded=await seedReservation({
      sql:admin,siteId,
      contactValue:"second@publisher.example.org",
      requestFingerprint:FP("8"),
      subject:"Second reviewed message",
      body:"A separate reviewed outreach message.",
      reservationChar:"8",
      logicalChar:"9",
    });
    const mock=createAuthorityOutreachMockSingleSendAdapter("uncertain");
    let calls=0;
    const counted={
      adapterClass:mock.adapterClass,
      networkOperationCapable:mock.networkOperationCapable,
      async send(intent:Parameters<typeof mock.send>[0]){
        calls+=1;
        return mock.send(intent);
      },
    };
    const first=await executeAuthorityOutreachSingleSend({
      databaseUrl:url,
      ...seeded,
      actorId:"operator@example.com",
      adapter:counted,
    });
    assert.equal(first.disposition,"mock_uncertain");
    assert.equal(first.execution.state,"uncertain");
    assert.equal(calls,1);

    const replay=await executeAuthorityOutreachSingleSend({
      databaseUrl:url,
      ...seeded,
      actorId:"operator@example.com",
      adapter:counted,
    });
    assert.equal(replay.disposition,"existing_uncertain");
    assert.equal(replay.adapterAttemptCount,0);
    assert.equal(calls,1);
    const reservation=await admin.unsafe<{status:string}[]>(
      "SELECT status FROM authority_outreach_send_reservations WHERE reservation_id=$1",
      [seeded.reservationId],
    );
    assert.equal(reservation[0]?.status,"uncertain");
  });

  await t.test("suppression added after reservation blocks claim before adapter invocation",async()=>{
    const seeded=await seedReservation({
      sql:admin,siteId,
      contactValue:"third@publisher.example.org",
      requestFingerprint:FP("a"),
      subject:"Third reviewed message",
      body:"A third reviewed outreach message.",
      reservationChar:"b",
      logicalChar:"c",
    });
    const safetyStore=new AuthorityOutreachOutboundSafetyStore({databaseUrl:url});
    await safetyStore.suppress({
      ownedSiteDomain:"diamondshelf.us",
      recipientDomain:"publisher.example.org",
      contactPointFingerprint:seeded.contactPointFingerprint,
      reasonCode:"explicit_opt_out",
      actorId:"operator@example.com",
    });
    const mock=createAuthorityOutreachMockSingleSendAdapter("accepted");
    let calls=0;
    const counted={
      adapterClass:mock.adapterClass,
      networkOperationCapable:mock.networkOperationCapable,
      async send(intent:Parameters<typeof mock.send>[0]){
        calls+=1;
        return mock.send(intent);
      },
    };
    await assert.rejects(
      ()=>executeAuthorityOutreachSingleSend({
        databaseUrl:url,
        ...seeded,
        actorId:"operator@example.com",
        adapter:counted,
      }),
      /ugp10_32_contact_suppressed/,
    );
    assert.equal(calls,0);
    const executions=await admin.unsafe<{count:number}[]>(
      "SELECT COUNT(*)::int AS count FROM authority_outreach_single_send_executions WHERE reservation_id=$1",
      [seeded.reservationId],
    );
    assert.equal(executions[0]?.count,0);
  });

  const columns=await admin.unsafe<{column_name:string}[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('authority_outreach_single_send_executions','authority_outreach_single_send_execution_events') ORDER BY table_name,ordinal_position",
  );
  assert.doesNotMatch(
    columns.map(row=>row.column_name).join(" "),
    /contact_point_value|email_address|message_body|email_body|subject_text|body_text|api_key|access_token|refresh_token|password|provider_secret|credential_value/i,
  );
});
