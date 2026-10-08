import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { ensureDiamondShelfIdentity } from "@workspace/db";
import { buildUgp1033ControlledCertificationFixture } from "./authority-outreach-ugp-10-33-fixture.js";

if(process.env.NODE_ENV==="production"){
  throw new Error("ugp10_33_production_db_prepare_forbidden");
}
if(process.env.UGP_10_33_CERT_DB_PREPARE_ENABLED?.trim().toLowerCase()!=="true"){
  throw new Error("ugp10_33_db_prepare_disabled");
}
const databaseUrl=process.env.DATABASE_URL?.trim()??"";
const sourceCommitSha=process.env.UGP_10_33_SOURCE_COMMIT_SHA?.trim()??"";
const receiverUrl=process.env.UGP_10_33_CERT_RECEIVER_URL?.trim()??"";
const authorizationLiteral=process.env.UGP_10_33_AUTHORIZATION_LITERAL?.trim()??"";
if(!databaseUrl||!sourceCommitSha||!receiverUrl||!authorizationLiteral){
  throw new Error("ugp10_33_db_prepare_inputs_required");
}
const built=buildUgp1033ControlledCertificationFixture({
  sourceCommitSha,
  receiverUrl,
});
if(authorizationLiteral!==built.plan.authorizationLiteral){
  throw new Error("ugp10_33_exact_authorization_literal_required");
}

const sql=postgres(databaseUrl,{max:1,prepare:false,connect_timeout:10,idle_timeout:2});
try{
  const before=await sql.unsafe<{count:number}[]>(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  if(Number(before[0]?.count??0)!==0){
    throw new Error("ugp10_33_cert_database_must_be_empty");
  }
  const migrations=[
    "0001_core.sql",
    "0002_auth.sql",
    "0003_observation_evidence_schema.sql",
    "0004_first_party_crawl_execution_state.sql",
    "0005_p8_8_policy_mutation_reservations.sql",
    "0006_p8_8_policy_mutation_controls.sql",
    "0007_p8_8_policy_mutation_dispatch.sql",
    "0008_ugp_10_3_authority_outreach_review_events.sql",
    "0009_ugp_10_31_outbound_safety_ledger.sql",
    "0010_ugp_10_32_single_send_execution.sql",
    "0011_ugp_10_33_controlled_https_certification.sql",
  ];
  for(const name of migrations){
    const migrationPath=path.resolve(
      process.cwd(),
      "lib/db/migrations",
      name,
    );
    await sql.unsafe(await readFile(migrationPath,"utf8"));
  }
  const identity=await ensureDiamondShelfIdentity(databaseUrl);
  if(identity.status!=="ready"||identity.tableCount!==49){
    throw new Error("ugp10_33_cert_database_identity_not_ready");
  }
  const reasons=await sql.unsafe<{definition:string}[]>(
    "SELECT pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid WHERE r.relname='authority_outreach_single_send_execution_events' AND c.contype='c' AND pg_get_constraintdef(c.oid) LIKE '%event_reason%'",
  );
  const definition=reasons.map(row=>row.definition).join(" ");
  if(
    !definition.includes("controlled_https_cert_accepted")
    ||!definition.includes("controlled_https_cert_rejected")
    ||!definition.includes("controlled_https_cert_uncertain")
  ){
    throw new Error("ugp10_33_cert_event_reason_constraint_not_ready");
  }
  process.stdout.write(JSON.stringify({
    version:"ugp-10-33-controlled-real-web-submission-certification-v1",
    databasePrepared:true,
    tableCount:identity.tableCount,
    targetDomain:identity.domain,
    planFingerprint:built.plan.planFingerprint,
    providerCalls:0,
    networkSends:0,
  },null,2)+"\n");
}finally{
  await sql.end({timeout:1}).catch(()=>undefined);
}
