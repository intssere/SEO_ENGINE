/** UGP-11.1D9: isolated append-only lineage fixture; no authority or claim grant. */
import postgres from "postgres";
import {reviewP9FixtureDecision,type P9FixtureSignedDecision} from "./ugp-11-1d8-signed-lineage.js";
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
export type FixtureJournalResult=Readonly<{kind:"appended"|"exact_replay"|"conflict"|"invalid_signature";authorityGranted:false;claimAllowed:false;dispatchAllowed:false}>;
export class Ugp11FixtureDecisionJournal{
 private readonly db:ReturnType<typeof postgres>;
 constructor(databaseUrl:string){
  if(typeof databaseUrl!=="string")throw Error("explicit_disposable_database_required");
  const u=new URL(databaseUrl);
  if(!["postgres:","postgresql:"].includes(u.protocol)||!["127.0.0.1","localhost"].includes(u.hostname)||u.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
  this.db=postgres(databaseUrl,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
 }
 async close():Promise<void>{await this.db.end({timeout:2});}
 async append(signed:P9FixtureSignedDecision,key:Uint8Array):Promise<FixtureJournalResult>{
  const deny=(kind:FixtureJournalResult["kind"]):FixtureJournalResult=>({kind,authorityGranted:false,claimAllowed:false,dispatchAllowed:false});
  const d=signed?.decision;
  if(!d||![d.tenantId,d.siteId].every(v=>typeof v==="string"&&ID.test(v)))return deny("conflict");
  return await this.db.begin(async tx=>{
   // Serializes all potential writers in this tenant/site for contiguous revisions.
   await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"ugp11-d9|"+d.tenantId+"|"+d.siteId},0))`;
   const rows=await tx`SELECT revision,fingerprint,decision_id,nonce,fixture_mac
    FROM ugp11_transport_fixture.decision_journal WHERE tenant_id=${d.tenantId} AND site_id=${d.siteId}
    ORDER BY revision DESC LIMIT 1`;
   const prior=rows[0]?{revision:Number(rows[0].revision),fingerprint:String(rows[0].fingerprint).trim(),tenantId:d.tenantId,siteId:d.siteId}:null;
   const review=reviewP9FixtureDecision(signed,key,prior);
   if(!review.signatureValid)return deny("invalid_signature");
   if(!review.lineageValid){
    const existing=await tx`SELECT fingerprint,fixture_mac FROM ugp11_transport_fixture.decision_journal
      WHERE tenant_id=${d.tenantId} AND site_id=${d.siteId} AND revision=${d.revision}
      AND decision_id=${d.decisionId} AND nonce=${d.nonce}`;
    if(existing.length===1&&String(existing[0].fingerprint).trim()===signed.fingerprint&&
       String(existing[0].fixture_mac).trim()===signed.mac)return deny("exact_replay");
    return deny("conflict");
   }
   // No trusted issuers exist. Journal entries are only test-fixture records.
   const added=await tx`INSERT INTO ugp11_transport_fixture.decision_journal
    (tenant_id,site_id,revision,decision_id,nonce,principal_id,mode,
     prior_fingerprint,fingerprint,fixture_mac,effective_at,expires_at)
    VALUES (${d.tenantId},${d.siteId},${d.revision},${d.decisionId},${d.nonce},
     ${d.principalId},${d.mode},${d.priorFingerprint},${signed.fingerprint},
     ${signed.mac},${d.effectiveAt},${d.expiresAt}) ON CONFLICT DO NOTHING RETURNING revision`;
   return deny(added.length===1?"appended":"conflict");
  });
 }
}
