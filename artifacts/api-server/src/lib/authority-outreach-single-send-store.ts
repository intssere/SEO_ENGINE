import { createHash } from "node:crypto";
import postgres from "postgres";
import {
  UGP_10_31_CONTACT_RATE_LIMIT,
  UGP_10_31_DOMAIN_RATE_LIMIT,
} from "./authority-outreach-outbound-safety-intent.js";
import {
  assertAuthorityOutreachSingleSendExecutionIntentIntegrity,
  UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_EVENT_VERSION,
  UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION,
  type AuthorityOutreachSingleSendExecutionIntent,
} from "./authority-outreach-single-send-intent.js";

export const UGP_10_32_EXPECTED_TABLE_COUNT=49 as const;

export type AuthorityOutreachSingleSendExecutionState=
  |"claimed"
  |"accepted"
  |"rejected"
  |"uncertain";

export type AuthorityOutreachSingleSendExecutionRecord=Readonly<{
  version:typeof UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION;
  executionId:string;
  executionFingerprint:string;
  reservationId:string;
  reservationFingerprint:string;
  siteId:string;
  selectedContactPointFingerprint:string;
  candidateFingerprint:string;
  payloadFingerprint:string;
  adapterClass:string;
  state:AuthorityOutreachSingleSendExecutionState;
  attemptCount:1;
  claimedAt:string;
  completedAt:string|null;
  adapterReceiptFingerprint:string|null;
  terminalReason:string|null;
  durable:true;
  automaticRetryAuthorized:false;
  rawPayloadPersisted:false;
}>;

export type AuthorityOutreachSingleSendClaimResult=Readonly<{
  kind:"created"|"existing";
  record:AuthorityOutreachSingleSendExecutionRecord;
  adapterInvocationEligible:boolean;
}>;

type Sql=ReturnType<typeof postgres>;
type SqlLike=any;

type ReservationRow={
  reservation_id:string;
  reservation_fingerprint:string;
  site_id:string;
  selected_contact_point_fingerprint:string;
  candidate_fingerprint:string;
  recipient_domain:string;
  status:"reserved"|"released"|"consumed"|"uncertain";
  reserved_at:Date;
  expires_at:Date;
};

type ExecutionRow={
  execution_id:string;
  execution_version:string;
  execution_fingerprint:string;
  reservation_id:string;
  reservation_fingerprint:string;
  site_id:string;
  selected_contact_point_fingerprint:string;
  candidate_fingerprint:string;
  payload_fingerprint:string;
  adapter_class:string;
  state:AuthorityOutreachSingleSendExecutionState;
  attempt_count:number;
  claimed_at:Date;
  completed_at:Date|null;
  adapter_receipt_fingerprint:string|null;
  terminal_reason:string|null;
};

type EventRow={
  event_id:string;
  event_fingerprint:string;
  sequence:number;
};

const ACTOR=/^[A-Za-z0-9_.:@-]{1,120}$/;
const HEX64=/^[0-9a-f]{64}$/;

function stableJson(value:unknown):string{
  if(value===undefined) return "null";
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(stableJson).join(",")+"]";
  const object=value as Record<string,unknown>;
  return "{"+Object.keys(object).sort().map(
    key=>JSON.stringify(key)+":"+stableJson(object[key]),
  ).join(",")+"}";
}

function hash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function actor(value:string):string{
  if(!ACTOR.test(value)||value.trim()!==value){
    throw new Error("ugp10_32_invalid_actor_id");
  }
  return value;
}

function fingerprint(value:string,field:string):string{
  if(!HEX64.test(value)) throw new Error("ugp10_32_invalid_"+field);
  return value;
}

function record(row:ExecutionRow):AuthorityOutreachSingleSendExecutionRecord{
  if(
    row.execution_version!==UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION
    ||!HEX64.test(row.execution_fingerprint)
    ||Number(row.attempt_count)!==1
  ){
    throw new Error("ugp10_32_persisted_execution_invalid");
  }
  return Object.freeze({
    version:UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION,
    executionId:row.execution_id,
    executionFingerprint:row.execution_fingerprint,
    reservationId:row.reservation_id,
    reservationFingerprint:row.reservation_fingerprint,
    siteId:row.site_id,
    selectedContactPointFingerprint:row.selected_contact_point_fingerprint,
    candidateFingerprint:row.candidate_fingerprint,
    payloadFingerprint:row.payload_fingerprint,
    adapterClass:row.adapter_class,
    state:row.state,
    attemptCount:1 as const,
    claimedAt:row.claimed_at.toISOString(),
    completedAt:row.completed_at?.toISOString()??null,
    adapterReceiptFingerprint:row.adapter_receipt_fingerprint,
    terminalReason:row.terminal_reason,
    durable:true as const,
    automaticRetryAuthorized:false as const,
    rawPayloadPersisted:false as const,
  });
}

const EXECUTION_COLUMNS=[
  "execution_id",
  "execution_version",
  "execution_fingerprint",
  "reservation_id",
  "reservation_fingerprint",
  "site_id::text AS site_id",
  "selected_contact_point_fingerprint",
  "candidate_fingerprint",
  "payload_fingerprint",
  "adapter_class",
  "state",
  "attempt_count",
  "claimed_at",
  "completed_at",
  "adapter_receipt_fingerprint",
  "terminal_reason",
].join(",");

async function assertSchema(sql:Sql):Promise<void>{
  const counts=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  if(Number(counts[0]?.count??0)!==UGP_10_32_EXPECTED_TABLE_COUNT){
    throw new Error("ugp10_32_schema_table_count_mismatch");
  }
  for(const table of [
    "authority_outreach_send_reservations",
    "authority_outreach_suppressions",
    "authority_outreach_single_send_executions",
    "authority_outreach_single_send_execution_events",
  ]){
    const rows=await sql.unsafe<{relation:string|null}[]>(
      "SELECT to_regclass($1)::text AS relation",
      ["public."+table],
    );
    if(rows[0]?.relation!==table){
      throw new Error("ugp10_32_schema_relation_missing:"+table);
    }
  }
}

function rowMatchesIntent(
  row:ExecutionRow,
  intent:AuthorityOutreachSingleSendExecutionIntent,
):boolean{
  return row.execution_id===intent.executionId
    &&row.execution_fingerprint===intent.executionFingerprint
    &&row.reservation_id===intent.reservationId
    &&row.reservation_fingerprint===intent.reservationFingerprint
    &&row.selected_contact_point_fingerprint===intent.selectedContactPointFingerprint
    &&row.candidate_fingerprint===intent.candidateFingerprint
    &&row.payload_fingerprint===intent.payloadFingerprint
    &&row.adapter_class===intent.adapterClass;
}

async function appendEvent(
  tx:SqlLike,
  row:ExecutionRow,
  eventType:"claimed"|"accepted"|"rejected"|"uncertain",
  eventReason:
    |"execution_preflight_passed"
    |"mock_adapter_accepted"
    |"mock_adapter_rejected"
    |"mock_adapter_uncertain"
    |"execution_recovery_uncertain",
  adapterReceiptFingerprint:string|null,
  actorId:string,
  occurredAt:Date,
):Promise<string>{
  const prior=await tx.unsafe(
    "SELECT event_id,event_fingerprint,sequence::int AS sequence"
      +" FROM authority_outreach_single_send_execution_events"
      +" WHERE execution_id=$1 ORDER BY sequence DESC,event_id DESC LIMIT 1 FOR UPDATE",
    [row.execution_id],
  ) as EventRow[];
  const sequence=(prior[0]?.sequence??0)+1;
  const previousEventFingerprint=prior[0]?.event_fingerprint??null;
  const eventFingerprint=hash({
    purpose:"ugp10_32_single_send_execution_event",
    version:UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_EVENT_VERSION,
    executionId:row.execution_id,
    executionFingerprint:row.execution_fingerprint,
    reservationId:row.reservation_id,
    siteId:row.site_id,
    sequence,
    previousEventFingerprint,
    eventType,
    eventReason,
    adapterReceiptFingerprint,
    actorId,
    occurredAt:occurredAt.toISOString(),
  });
  const eventId="uaosxe-"+eventFingerprint.slice(0,24);
  const inserted=await tx.unsafe(
    "INSERT INTO authority_outreach_single_send_execution_events"
      +"(event_id,event_version,event_fingerprint,execution_id,execution_fingerprint,"
      +"reservation_id,site_id,sequence,previous_event_fingerprint,event_type,"
      +"event_reason,adapter_receipt_fingerprint,actor_id,occurred_at)"
      +" VALUES($1,$2,$3,$4,$5,$6,$7::uuid,$8,$9,$10,$11,$12,$13,$14::timestamptz)"
      +" RETURNING event_fingerprint",
    [
      eventId,
      UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_EVENT_VERSION,
      eventFingerprint,
      row.execution_id,
      row.execution_fingerprint,
      row.reservation_id,
      row.site_id,
      sequence,
      previousEventFingerprint,
      eventType,
      eventReason,
      adapterReceiptFingerprint,
      actorId,
      occurredAt.toISOString(),
    ],
  ) as {event_fingerprint:string}[];
  if(inserted[0]?.event_fingerprint!==eventFingerprint){
    throw new Error("ugp10_32_execution_event_write_verification_failed");
  }
  return eventFingerprint;
}

export class AuthorityOutreachSingleSendExecutionStore{
  private readonly databaseUrl:string;
  private readonly sqlFactory:(databaseUrl:string)=>Sql;

  constructor(options:{
    databaseUrl:string;
    sqlFactory?:(databaseUrl:string)=>Sql;
  }){
    this.databaseUrl=options.databaseUrl?.trim()??"";
    if(!this.databaseUrl) throw new Error("ugp10_32_database_url_required");
    this.sqlFactory=options.sqlFactory??((databaseUrl)=>postgres(databaseUrl,{
      max:4,
      prepare:false,
      connect_timeout:8,
      idle_timeout:2,
    }));
  }

  async claim(input:{
    intent:AuthorityOutreachSingleSendExecutionIntent;
    intentInput:Parameters<typeof assertAuthorityOutreachSingleSendExecutionIntentIntegrity>[1];
    actorId:string;
  }):Promise<AuthorityOutreachSingleSendClaimResult>{
    assertAuthorityOutreachSingleSendExecutionIntentIntegrity(
      input.intent,
      input.intentInput,
    );
    const actorId=actor(input.actorId);
    const intent=input.intent;
    const sql=this.sqlFactory(this.databaseUrl);
    try{
      await assertSchema(sql);
      return await sql.begin(async(tx)=>{
        const reservationRows=await tx.unsafe(
          "SELECT reservation_id,reservation_fingerprint,site_id::text AS site_id,"
            +"selected_contact_point_fingerprint,candidate_fingerprint,"
            +"recipient_domain,status,reserved_at,expires_at"
            +" FROM authority_outreach_send_reservations"
            +" WHERE reservation_id=$1 FOR UPDATE",
          [intent.reservationId],
        ) as ReservationRow[];
        const reservation=reservationRows[0];
        if(!reservation) throw new Error("ugp10_32_reservation_not_found");
        if(
          reservation.reservation_fingerprint!==intent.reservationFingerprint
          ||reservation.selected_contact_point_fingerprint
            !==intent.selectedContactPointFingerprint
          ||reservation.candidate_fingerprint!==intent.candidateFingerprint
          ||reservation.recipient_domain!==intent.recipientDomain
        ){
          throw new Error("ugp10_32_reservation_lineage_mismatch");
        }

        await tx.unsafe(
          "SELECT id FROM sites WHERE id=$1::uuid FOR UPDATE",
          [reservation.site_id],
        );
        const nowRows=await tx.unsafe("SELECT transaction_timestamp() AS now") as {now:Date}[];
        const now=nowRows[0]?.now;
        if(!(now instanceof Date)) throw new Error("ugp10_32_database_clock_unavailable");

        const existing=await tx.unsafe(
          "SELECT "+EXECUTION_COLUMNS
            +" FROM authority_outreach_single_send_executions"
            +" WHERE reservation_id=$1 LIMIT 1 FOR UPDATE",
          [intent.reservationId],
        ) as ExecutionRow[];
        if(existing[0]){
          if(!rowMatchesIntent(existing[0],intent)){
            throw new Error("ugp10_32_execution_identity_collision");
          }
          return Object.freeze({
            kind:"existing" as const,
            record:record(existing[0]),
            adapterInvocationEligible:false,
          });
        }

        if(reservation.status!=="reserved"){
          throw new Error("ugp10_32_reservation_not_reserved");
        }
        if(reservation.expires_at.getTime()<=now.getTime()){
          throw new Error("ugp10_32_reservation_expired");
        }

        const suppressed=await tx.unsafe(
          "SELECT suppression_id FROM authority_outreach_suppressions"
            +" WHERE site_id=$1::uuid AND contact_point_fingerprint=$2 LIMIT 1",
          [reservation.site_id,intent.selectedContactPointFingerprint],
        ) as {suppression_id:string}[];
        if(suppressed[0]) throw new Error("ugp10_32_contact_suppressed");

        const contactStart=new Date(
          now.getTime()-UGP_10_31_CONTACT_RATE_LIMIT.windowSeconds*1000,
        ).toISOString();
        const contactCounts=await tx.unsafe(
          "SELECT COUNT(*)::int AS count FROM authority_outreach_send_reservations"
            +" WHERE site_id=$1::uuid AND selected_contact_point_fingerprint=$2"
            +" AND reserved_at>$3::timestamptz",
          [reservation.site_id,intent.selectedContactPointFingerprint,contactStart],
        ) as {count:number}[];
        if(Number(contactCounts[0]?.count??0)>UGP_10_31_CONTACT_RATE_LIMIT.maximumReservations){
          throw new Error("ugp10_32_contact_rate_state_invalid");
        }

        const domainStart=new Date(
          now.getTime()-UGP_10_31_DOMAIN_RATE_LIMIT.windowSeconds*1000,
        ).toISOString();
        const domainCounts=await tx.unsafe(
          "SELECT COUNT(*)::int AS count FROM authority_outreach_send_reservations"
            +" WHERE site_id=$1::uuid AND recipient_domain=$2"
            +" AND reserved_at>$3::timestamptz",
          [reservation.site_id,intent.recipientDomain,domainStart],
        ) as {count:number}[];
        if(Number(domainCounts[0]?.count??0)>UGP_10_31_DOMAIN_RATE_LIMIT.maximumReservations){
          throw new Error("ugp10_32_domain_rate_state_invalid");
        }

        const inserted=await tx.unsafe(
          "INSERT INTO authority_outreach_single_send_executions"
            +"(execution_id,execution_version,execution_fingerprint,reservation_id,"
            +"reservation_fingerprint,site_id,selected_contact_point_fingerprint,"
            +"candidate_fingerprint,payload_fingerprint,adapter_class,state,"
            +"attempt_count,claimed_at)"
            +" VALUES($1,$2,$3,$4,$5,$6::uuid,$7,$8,$9,$10,'claimed',1,$11::timestamptz)"
            +" RETURNING "+EXECUTION_COLUMNS,
          [
            intent.executionId,
            UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION,
            intent.executionFingerprint,
            intent.reservationId,
            intent.reservationFingerprint,
            reservation.site_id,
            intent.selectedContactPointFingerprint,
            intent.candidateFingerprint,
            intent.payloadFingerprint,
            intent.adapterClass,
            now.toISOString(),
          ],
        ) as ExecutionRow[];
        const row=inserted[0];
        if(!row) throw new Error("ugp10_32_execution_claim_failed");
        await appendEvent(
          tx,row,"claimed","execution_preflight_passed",null,actorId,now,
        );
        return Object.freeze({
          kind:"created" as const,
          record:record(row),
          adapterInvocationEligible:true,
        });
      });
    }finally{
      await sql.end({timeout:1}).catch(()=>undefined);
    }
  }

  async finalize(input:{
    executionId:string;
    executionFingerprint:string;
    state:"accepted"|"rejected"|"uncertain";
    adapterReceiptFingerprint:string;
    reason:
      |"mock_adapter_accepted"
      |"mock_adapter_rejected"
      |"mock_adapter_uncertain"
      |"execution_recovery_uncertain";
    actorId:string;
  }):Promise<Readonly<{
    status:"transitioned"|"idempotent";
    record:AuthorityOutreachSingleSendExecutionRecord;
    eventFingerprint:string;
  }>>{
    fingerprint(input.executionFingerprint,"execution_fingerprint");
    fingerprint(input.adapterReceiptFingerprint,"adapter_receipt_fingerprint");
    const actorId=actor(input.actorId);
    const sql=this.sqlFactory(this.databaseUrl);
    try{
      await assertSchema(sql);
      return await sql.begin(async(tx)=>{
        const rows=await tx.unsafe(
          "SELECT "+EXECUTION_COLUMNS
            +" FROM authority_outreach_single_send_executions"
            +" WHERE execution_id=$1 FOR UPDATE",
          [input.executionId],
        ) as ExecutionRow[];
        const current=rows[0];
        if(!current) throw new Error("ugp10_32_execution_not_found");
        if(current.execution_fingerprint!==input.executionFingerprint){
          throw new Error("ugp10_32_execution_identity_collision");
        }
        if(current.state!=="claimed"){
          if(
            current.state===input.state
            &&current.adapter_receipt_fingerprint===input.adapterReceiptFingerprint
          ){
            const events=await tx.unsafe(
              "SELECT event_fingerprint FROM authority_outreach_single_send_execution_events"
                +" WHERE execution_id=$1 AND event_type=$2"
                +" ORDER BY sequence DESC LIMIT 1",
              [current.execution_id,input.state],
            ) as {event_fingerprint:string}[];
            if(!events[0]) throw new Error("ugp10_32_terminal_event_missing");
            return Object.freeze({
              status:"idempotent" as const,
              record:record(current),
              eventFingerprint:events[0].event_fingerprint,
            });
          }
          throw new Error("ugp10_32_execution_transition_not_allowed");
        }

        const nowRows=await tx.unsafe("SELECT transaction_timestamp() AS now") as {now:Date}[];
        const now=nowRows[0]?.now;
        if(!(now instanceof Date)) throw new Error("ugp10_32_database_clock_unavailable");
        const updated=await tx.unsafe(
          "UPDATE authority_outreach_single_send_executions"
            +" SET state=$2,completed_at=$3::timestamptz,"
            +"adapter_receipt_fingerprint=$4,terminal_reason=$5,"
            +"updated_at=$3::timestamptz"
            +" WHERE execution_id=$1 AND state='claimed'"
            +" RETURNING "+EXECUTION_COLUMNS,
          [
            current.execution_id,
            input.state,
            now.toISOString(),
            input.adapterReceiptFingerprint,
            input.reason,
          ],
        ) as ExecutionRow[];
        if(!updated[0]) throw new Error("ugp10_32_execution_transition_race");
        const eventFingerprint=await appendEvent(
          tx,
          updated[0],
          input.state,
          input.reason,
          input.adapterReceiptFingerprint,
          actorId,
          now,
        );
        return Object.freeze({
          status:"transitioned" as const,
          record:record(updated[0]),
          eventFingerprint,
        });
      });
    }finally{
      await sql.end({timeout:1}).catch(()=>undefined);
    }
  }
}

export function authorityOutreachSingleSendExecutionStoreCapability(){
  return Object.freeze({
    version:UGP_AUTHORITY_OUTREACH_SINGLE_SEND_EXECUTION_VERSION,
    expectedPublicTableCount:UGP_10_32_EXPECTED_TABLE_COUNT,
    durableClaimBeforeAdapterInvocation:true,
    oneExecutionPerReservation:true,
    oneAdapterAttemptPerExecution:true,
    preflightSuppressionRecheck:true,
    preflightContactRateRecheck:true,
    preflightRecipientDomainRateRecheck:true,
    immutableExecutionEventHistory:true,
    rawRecipientPersisted:false,
    rawMessagePersisted:false,
    providerCredentialPersisted:false,
    automaticRetryAuthorized:false,
    schedulerEnabled:false,
    workerEnabled:false,
    productionDdlAuthorized:false,
  });
}
