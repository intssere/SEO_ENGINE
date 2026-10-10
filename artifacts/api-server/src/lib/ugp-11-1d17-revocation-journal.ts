/** UGP-11.1D17: disposable append-only revocation journal. NEVER a trusted authority. */
import postgres from "postgres";
import {reviewOfflineRevocation,type SignedRevocation} from "./ugp-11-1d16-revocation-evidence.js";
export type RevocationAppendResult=Readonly<{
 kind:"appended"|"exact_replay"|"conflict"|"invalid_signature";
 keyTrusted:false;issuanceAllowed:false;claimAllowed:false;dispatchAllowed:false
}>;
const deny=(kind:RevocationAppendResult["kind"]):RevocationAppendResult=>
 Object.freeze({kind,keyTrusted:false,issuanceAllowed:false,claimAllowed:false,dispatchAllowed:false});
const ID=/^[A-Za-z0-9._:-]{1,128}$/;
export class Ugp11RevocationFixtureJournal {
 private readonly db:ReturnType<typeof postgres>;
 constructor(databaseUrl:string) {
  if(typeof databaseUrl!=="string")throw Error("explicit_disposable_database_required");
  const url=new URL(databaseUrl);
  if(!["postgres:","postgresql:"].includes(url.protocol)||
   !["127.0.0.1","localhost"].includes(url.hostname)||
   url.pathname!=="/seo_engine_test")throw Error("disposable_database_only");
  this.db=postgres(databaseUrl,{max:4,prepare:false,connect_timeout:8,idle_timeout:2});
 }
 async close(){await this.db.end({timeout:2});}
 async append(signed:SignedRevocation,publicKeyPem:string):Promise<RevocationAppendResult>{
  const d=signed?.event;
  if(!d||![d.issuer,d.tenantId,d.siteId,d.keyId].every(x=>typeof x==="string"&&ID.test(x)))
   return deny("conflict");
  return this.db.begin(async tx=>{
   // Serializes writers for the exact key identity across processes, including genesis.
   await tx`SELECT pg_advisory_xact_lock(hashtextextended(${"ugp11-d17|"+[d.issuer,d.tenantId,d.siteId,d.keyId].join("|")},0))`;
   const rows=await tx`SELECT sequence,fingerprint FROM ugp11_transport_fixture.revocation_events
    WHERE issuer=${d.issuer} AND tenant_id=${d.tenantId} AND site_id=${d.siteId}
      AND key_id=${d.keyId} ORDER BY sequence DESC LIMIT 1`;
   const prior=rows[0]?{issuer:d.issuer,tenantId:d.tenantId,siteId:d.siteId,keyId:d.keyId,
    sequence:Number(rows[0].sequence),fingerprint:String(rows[0].fingerprint).trim()}:null;
   const review=reviewOfflineRevocation(signed,publicKeyPem,prior);
   if(!review.signatureValid)return deny("invalid_signature");
   if(!review.lineageValid){
    const exists=await tx`SELECT fingerprint,fixture_signature FROM ugp11_transport_fixture.revocation_events
     WHERE issuer=${d.issuer} AND tenant_id=${d.tenantId} AND site_id=${d.siteId}
     AND key_id=${d.keyId} AND sequence=${d.sequence} AND event_id=${d.eventId}`;
    return deny(exists.length===1&&String(exists[0].fingerprint).trim()===signed.fingerprint&&
     exists[0].fixture_signature===signed.signature?"exact_replay":"conflict");
   }
   const inserted=await tx`INSERT INTO ugp11_transport_fixture.revocation_events
    (issuer,tenant_id,site_id,key_id,sequence,event_id,fingerprint,previous_fingerprint,
      action,effective_at,fixture_signature)
    VALUES (${d.issuer},${d.tenantId},${d.siteId},${d.keyId},${d.sequence},
     ${d.eventId},${signed.fingerprint},${d.previousFingerprint},${d.action},
     ${d.effectiveAt},${signed.signature}) ON CONFLICT DO NOTHING RETURNING sequence`;
   return deny(inserted.length===1?"appended":"conflict");
  });
 }
}
