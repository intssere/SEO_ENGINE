import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { createAuthSession, loadAuthConfig, loadAuthSession, revokeAuthSession } from "./auth-foundation.js";
import { createCviPrivateExpressDbComposition } from "./cvi-gsc-private-express-db-composition.js";
import { CVI_GSC_ACQUISITION_LINEAGE_VERSION, type CviGscAcquisitionLineage } from "./cvi-gsc-acquisition-lineage.js";

test("CVI-1C.28 disposable authenticated tenant/site private composition", async t => {
 const raw=process.env.CVI_1B4E_DISPOSABLE_DATABASE_URL;
 if(!raw){t.skip("explicit disposable database required");return;}
 const u=new URL(raw);
 assert.equal(u.protocol,"postgres:");
 assert.equal(u.hostname,"127.0.0.1");
 assert.equal(u.port,"5432");
 assert.equal(u.pathname,"/seo_engine_cvi_disposable");
 assert.equal(u.username,"postgres");
 assert.equal(u.search,"");
 assert.equal(u.hash,"");
 assert.equal(process.env.DATABASE_URL,undefined,"inherited DATABASE_URL is forbidden");
 const sql=postgres(raw,{max:1,prepare:false,connect_timeout:5});
 const configEnv:Record<string,string>={
  AUTH_ENFORCEMENT_ENABLED:"true",
  AUTH_PUBLIC_ORIGIN:"http://127.0.0.1",
  AUTH_GOOGLE_CLIENT_ID:"test-only.apps.googleusercontent.com",
  AUTH_GOOGLE_CLIENT_SECRET:"test-only",
  AUTH_SESSION_SECRET:"test-only-private-composition-0123456789abcdef",
  AUTH_ADMIN_EMAILS:"cvi28@example.test",
 };
 const old=new Map<string,string|undefined>();
 for(const key of [...Object.keys(configEnv),"DATABASE_URL"])old.set(key,process.env[key]);
 try{
  const db=await sql<{name:string;ledger:string|null}[]>`SELECT current_database() AS name,to_regclass('public.cvi_acquisition_nonce_ledger')::text AS ledger`;
  assert.equal(db[0]?.name,"seo_engine_cvi_disposable");
  assert.equal(db[0]?.ledger,"cvi_acquisition_nonce_ledger");
  for(const [key,value] of Object.entries(configEnv))process.env[key]=value;
  process.env.DATABASE_URL=raw;
  const config=loadAuthConfig();
  assert.equal(config.configured,true);
  const created=await createAuthSession({subject:"cvi28-subject",email:"cvi28@example.test",displayName:null,role:"admin",config});
  const principal=await loadAuthSession(created.token);
  assert.ok(principal);
  const org=(await sql<{id:string}[]>`INSERT INTO organizations(name,slug) VALUES('CVI28','cvi28-private') RETURNING id`)[0]!.id;
  const site=(await sql<{id:string}[]>`INSERT INTO sites(organization_id,name,domain,canonical_origin) VALUES(${org}::uuid,'CVI28','cvi28.test','https://cvi28.test') RETURNING id`)[0]!.id;
  const conn=(await sql<{id:string}[]>`INSERT INTO connections(site_id,provider,external_account_id,scopes,status) VALUES(${site}::uuid,'google','cvi28-test',ARRAY['https://www.googleapis.com/auth/webmasters.readonly'],'connected') RETURNING id`)[0]!.id;
  const member=(await sql<{id:string}[]>`INSERT INTO cvi_organization_memberships(organization_id,auth_subject,member_role,status,effective_at,revoked_at) VALUES(${org}::uuid,${principal.subject},'viewer','active',now()-interval '1 day',NULL) RETURNING id`)[0]!.id;
  const grant=(await sql<{id:string}[]>`INSERT INTO cvi_site_read_grants(organization_membership_id,organization_id,site_id,permission,status,effective_at,revoked_at) VALUES(${member}::uuid,${org}::uuid,${site}::uuid,'read_evidence','active',now()-interval '1 day',NULL) RETURNING id`)[0]!.id;
  const acquisition="cvi28-acquisition",nonce="cvi28-nonce",resource="sc-domain:cvi28.test",fingerprint="a".repeat(64);
  await sql`INSERT INTO cvi_acquisition_nonce_ledger(acquisition_id,tenant_id,site_id,connection_id,auth_subject,auth_session_id,request_nonce,requested_resource,observation_fingerprint,requested_at,observed_at) VALUES(${acquisition},${org}::uuid,${site}::uuid,${conn}::uuid,${principal.subject},${principal.sessionId}::uuid,${nonce},${resource},${fingerprint},now()-interval '2 minutes',now()-interval '1 minute')`;
  const lineage:CviGscAcquisitionLineage={
   version:CVI_GSC_ACQUISITION_LINEAGE_VERSION,status:"UNTRUSTED_CAPTURE_REVIEW_ONLY",reasons:[],
   tenantId:org,siteId:site,connectionId:conn,authSubject:principal.subject,authSessionId:principal.sessionId,
   acquisitionId:acquisition,requestNonce:nonce,requestedResource:resource,observationFingerprint:fingerprint,
   attestationFingerprint:"b".repeat(64),packetFingerprint:"c".repeat(64),
   requestIdentityConsistent:true,independentProviderOriginVerified:false,independentOAuthCustodyVerified:false,
   durableReplayVerified:false,executionAuthorized:false,publicationAuthorized:false,
  };
  const composition=createCviPrivateExpressDbComposition({sql,authConfig:config,now:()=>new Date().toISOString()});
  const read=(subject=principal.subject,l=lineage)=>composition({req:{auth:{...principal,subject}},acquisitionId:acquisition,lineage:l});
  const positive=await read();
  assert.equal(positive.status,"UNTRUSTED_HISTORICAL_REVIEW_ONLY");
  assert.equal(positive.providerOriginVerified,false);
  assert.equal(positive.tenantAuthorizationForFutureOperations,false);
  assert.equal(positive.executionAuthorized,false);
  assert.equal(positive.publicationAuthorized,false);
  assert.equal((await read("forged-subject")).status,"DENY");
  assert.equal((await read(principal.subject,{...lineage,siteId:"wrong"})).status,"DENY");
  await sql`UPDATE cvi_site_read_grants SET status='revoked',revoked_at=now() WHERE id=${grant}::uuid`;
  assert.equal((await read()).status,"DENY");
  await sql`UPDATE cvi_site_read_grants SET status='active',revoked_at=NULL WHERE id=${grant}::uuid`;
  assert.equal((await read()).status,"UNTRUSTED_HISTORICAL_REVIEW_ONLY");
  await sql`UPDATE cvi_organization_memberships SET status='revoked',revoked_at=now() WHERE id=${member}::uuid`;
  assert.equal((await read()).status,"DENY");
  await sql`UPDATE cvi_organization_memberships SET status='active',revoked_at=NULL WHERE id=${member}::uuid`;
  await sql`UPDATE connections SET scopes=ARRAY[]::text[] WHERE id=${conn}::uuid`;
  assert.equal((await read()).status,"DENY");
  await sql`UPDATE connections SET scopes=ARRAY['https://www.googleapis.com/auth/webmasters.readonly'] WHERE id=${conn}::uuid`;
  assert.equal((await read()).status,"UNTRUSTED_HISTORICAL_REVIEW_ONLY");
  // CVI-1C.29: concurrent revocation must serialize with both private read statements.
  const rival=postgres(raw,{max:1,prepare:false,connect_timeout:5});
  try{
   for(const target of [
    {table:"cvi_site_read_grants",id:grant},
    {table:"cvi_organization_memberships",id:member},
    {table:"connections",id:conn},
    {table:"sites",id:site},
   ] as const){
    await rival.unsafe("BEGIN");
    let pending:Promise<Awaited<ReturnType<typeof read>>>|undefined;
    try{
     const mutation=target.table==="connections"
      ?"UPDATE connections SET status='revoked' WHERE id=$1::uuid"
      :target.table==="sites"
      ?"UPDATE sites SET is_active=false WHERE id=$1::uuid"
      :`UPDATE ${target.table} SET status='revoked',revoked_at=now() WHERE id=$1::uuid`;
     await rival.unsafe(mutation,[target.id]);
     let settled=false;
     pending=read().then(v=>{settled=true;return v;},e=>{settled=true;throw e;});
     await new Promise(resolve=>setTimeout(resolve,120));
     assert.equal(settled,false,`private read must block behind uncommitted ${target.table} revoke`);
     await rival.unsafe("COMMIT");
     assert.equal((await pending).status,"DENY",`post-commit ${target.table} revocation denies`);
     pending=undefined;
     await sql.unsafe(target.table==="connections"
      ?"UPDATE connections SET status='connected' WHERE id=$1::uuid"
      :target.table==="sites"
      ?"UPDATE sites SET is_active=true WHERE id=$1::uuid"
      :`UPDATE ${target.table} SET status='active',revoked_at=NULL WHERE id=$1::uuid`,[target.id]);
     assert.equal((await read()).status,"UNTRUSTED_HISTORICAL_REVIEW_ONLY");
    }finally{
     await rival.unsafe("ROLLBACK").catch(()=>undefined);
     if(pending)await pending.catch(()=>undefined);
    }
   }
  }finally{await rival.end({timeout:1});}
  await revokeAuthSession(created.token);
  assert.equal((await read()).status,"DENY");
 }finally{
  await sql.end({timeout:1});
  for(const [key,value] of old)if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
