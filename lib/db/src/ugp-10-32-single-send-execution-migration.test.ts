import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import postgres from "postgres";
import {
  EXPECTED_UGP_10_31_TABLE_COUNT,
  EXPECTED_UGP_10_32_TABLE_COUNT,
  ensureDiamondShelfIdentity,
} from "./runtime-bootstrap.js";

function H(value:string):string{
  return createHash("sha256").update(value).digest("hex");
}

function migrationPath():string{
  return fileURLToPath(
    new URL("../migrations/0010_ugp_10_32_single_send_execution.sql",import.meta.url),
  );
}

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

test("UGP-10.32 migration source is additive, transactional, bounded, and raw-payload free",async()=>{
  const source=await readFile(migrationPath(),"utf8");
  assert.match(source,/^BEGIN;/);
  assert.match(source,/COMMIT;\s*$/);
  assert.equal((source.match(/\bCREATE\s+TABLE\s+/gi)??[]).length,2);
  assert.equal((source.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+/gi)??[]).length,3);
  assert.equal((source.match(/\bCREATE\s+TRIGGER\s+/gi)??[]).length,4);
  assert.match(source,/authority_outreach_single_send_executions/);
  assert.match(source,/authority_outreach_single_send_execution_events/);
  assert.match(source,/attempt_count smallint NOT NULL DEFAULT 1 CHECK \(attempt_count=1\)/);
  assert.match(source,/UNIQUE REFERENCES authority_outreach_send_reservations/);
  assert.equal(
    /\bINSERT\s+INTO\b|\bUPDATE\s+[A-Za-z_][A-Za-z0-9_.]*\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+INTO\b|\bCOPY\s+[A-Za-z_]/i.test(source),
    false,
  );
  assert.doesNotMatch(
    source,
    /contact_point_value|email_address|message_body|email_body|subject_text|body_text|api_key|access_token|refresh_token|password|provider_secret|credential_value/i,
  );
});

test("UGP-10.32 migration applies only to localhost 47-table baseline and preserves execution audit",async(t)=>{
  const url=databaseUrl();
  if(!url){
    t.skip("UGP_10_32_EPHEMERAL_DATABASE_URL is not configured");
    return;
  }
  const sql=postgres(url,{max:1,prepare:false,connect_timeout:8,idle_timeout:2});
  t.after(async()=>{await sql.end({timeout:1}).catch(()=>undefined);});

  const before=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(before[0]?.count??0),EXPECTED_UGP_10_31_TABLE_COUNT);

  await sql.unsafe(await readFile(migrationPath(),"utf8"));

  const after=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  assert.equal(Number(after[0]?.count??0),EXPECTED_UGP_10_32_TABLE_COUNT);

  const identity=await ensureDiamondShelfIdentity(url);
  assert.equal(identity.status,"ready");
  assert.equal(identity.tableCount,EXPECTED_UGP_10_32_TABLE_COUNT);

  const columns=await sql.unsafe<{column_name:string}[]>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('authority_outreach_single_send_executions','authority_outreach_single_send_execution_events') ORDER BY table_name,ordinal_position",
  );
  assert.doesNotMatch(
    columns.map(row=>row.column_name).join(" "),
    /contact_point_value|email_address|message_body|email_body|subject_text|body_text|api_key|access_token|refresh_token|password|provider_secret|credential_value/i,
  );

  const site=await sql.unsafe<{id:string}[]>(
    "SELECT id::text AS id FROM sites WHERE lower(domain)='diamondshelf.us' AND is_active=true ORDER BY updated_at DESC LIMIT 1",
  );
  assert.ok(site[0]?.id);

  await sql.unsafe("BEGIN");
  try{
    const reservationFp=H("ugp10-32-migration-reservation");
    const reservationId="uaosr-"+reservationFp.slice(0,24);
    await sql.unsafe(
      "INSERT INTO authority_outreach_send_reservations(reservation_id,reservation_version,reservation_fingerprint,logical_send_key,site_id,delivery_binding_authorization_decision_fingerprint,delivery_binding_authorization_review_spec_fingerprint,prospect_fingerprint,opportunity_fingerprint,candidate_fingerprint,selected_role_candidate_fingerprint,selected_contact_point_fingerprint,send_review_fingerprint,quality_gate_fingerprint,recipient_domain,status,reserved_at,expires_at) VALUES($1,'ugp-10-31-outbound-safety-reservation-v1',$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,'publisher.example.org','reserved',transaction_timestamp(),transaction_timestamp()+interval '15 minutes')",
      [
        reservationId,
        reservationFp,
        H("ugp10-32-migration-logical-send"),
        site[0].id,
        H("ugp10-32-migration-authorization-decision"),
        H("ugp10-32-migration-authorization-review"),
        H("ugp10-32-migration-prospect"),
        H("ugp10-32-migration-opportunity"),
        H("ugp10-32-migration-candidate"),
        H("ugp10-32-migration-role"),
        H("ugp10-32-migration-contact"),
        H("ugp10-32-migration-send-review"),
        H("ugp10-32-migration-quality-gate"),
      ],
    );
    const reservation=[{
      reservation_id:reservationId,
      reservation_fingerprint:reservationFp,
    }];
    const executionFp=H("ugp10-32-migration-execution");
    const executionId="uaosx-"+executionFp.slice(0,24);
    await sql.unsafe(
      "INSERT INTO authority_outreach_single_send_executions(execution_id,execution_version,execution_fingerprint,reservation_id,reservation_fingerprint,site_id,selected_contact_point_fingerprint,candidate_fingerprint,payload_fingerprint,adapter_class,state,attempt_count,claimed_at) VALUES($1,'ugp-10-32-single-send-execution-v1',$2,$3,$4,$5::uuid,$6,$7,$8,'mock','claimed',1,transaction_timestamp())",
      [
        executionId,executionFp,reservation[0].reservation_id,
        reservation[0].reservation_fingerprint,site[0].id,
        H("ugp10-32-migration-exec-contact"),H("ugp10-32-migration-exec-candidate"),H("ugp10-32-migration-exec-payload"),
      ],
    );
    const eventFp=H("ugp10-32-migration-event");
    await sql.unsafe(
      "INSERT INTO authority_outreach_single_send_execution_events(event_id,event_version,event_fingerprint,execution_id,execution_fingerprint,reservation_id,site_id,sequence,previous_event_fingerprint,event_type,event_reason,adapter_receipt_fingerprint,actor_id,occurred_at) VALUES($1,'ugp-10-32-single-send-execution-event-v1',$2,$3,$4,$5,$6::uuid,1,NULL,'claimed','execution_preflight_passed',NULL,'fixture:migration',transaction_timestamp())",
      [
        "uaosxe-"+eventFp.slice(0,24),eventFp,executionId,executionFp,
        reservation[0].reservation_id,site[0].id,
      ],
    );

    for(const [name,statement] of [
      ["execution_delete","DELETE FROM authority_outreach_single_send_executions"],
      ["execution_truncate","TRUNCATE authority_outreach_single_send_executions CASCADE"],
      ["event_update","UPDATE authority_outreach_single_send_execution_events SET actor_id='fixture:other'"],
      ["event_delete","DELETE FROM authority_outreach_single_send_execution_events"],
      ["event_truncate","TRUNCATE authority_outreach_single_send_execution_events"],
    ] as const){
      await sql.unsafe("SAVEPOINT "+name);
      try{
        await sql.unsafe(statement);
        assert.fail(name+" unexpectedly succeeded");
      }catch(error){
        assert.equal((error as {code?:string}).code,"55000");
      }
      await sql.unsafe("ROLLBACK TO SAVEPOINT "+name);
      await sql.unsafe("RELEASE SAVEPOINT "+name);
    }

    await sql.unsafe(
      "UPDATE authority_outreach_single_send_executions SET state='uncertain',completed_at=transaction_timestamp(),adapter_receipt_fingerprint=$2,terminal_reason='migration_test_uncertain',updated_at=transaction_timestamp() WHERE execution_id=$1",
      [executionId,H("ugp10-32-migration-terminal-receipt")],
    );
    const state=await sql.unsafe<{state:string}[]>(
      "SELECT state FROM authority_outreach_single_send_executions WHERE execution_id=$1",
      [executionId],
    );
    assert.equal(state[0]?.state,"uncertain");
  }finally{
    await sql.unsafe("ROLLBACK");
  }
});
