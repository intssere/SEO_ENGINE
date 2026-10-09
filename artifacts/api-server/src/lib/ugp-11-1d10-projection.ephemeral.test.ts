import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {signP9FixtureDecision,type P9FixtureDecision} from "./ugp-11-1d8-signed-lineage.js";
import {Ugp11FixtureDecisionJournal} from "./ugp-11-1d9-journal.js";
const key=Buffer.alloc(32,37),genesis="0".repeat(64);
const base:P9FixtureDecision={
 tenantId:"d10-tenant",siteId:"d10-site",decisionId:"d10-one",principalId:"fixture-principal",
 revision:1,priorRevision:0,priorFingerprint:genesis,mode:"running",
 effectiveAt:"2026-10-09T10:00:00.000Z",expiresAt:"2026-10-12T10:00:00.000Z",nonce:"d10-nonce-one"
};
test("D10 projection remains unauthorized on matching, paused, and replayed fixture lineage",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL?.trim();
 if(!url){t.skip("dedicated disposable PostgreSQL unavailable");return;}
 const db=postgres(url,{max:2,prepare:false});
 const journal=new Ugp11FixtureDecisionJournal(url);
 t.after(async()=>{await journal.close();await db.end({timeout:2});});
 const first=signP9FixtureDecision(base,key);
 assert.equal((await journal.append(first,key)).kind,"appended");
 const firstRows=await db`SELECT * FROM ugp11_transport_fixture.control_projection_review
 WHERE tenant_id='d10-tenant' AND site_id='d10-site'`;
 assert.equal(firstRows.length,1);
 assert.equal(firstRows[0]?.mode,"running");
 assert.equal(firstRows[0]?.authority_verified,false);
 assert.equal(firstRows[0]?.claim_allowed,false);
 assert.equal(firstRows[0]?.dispatch_allowed,false);
 assert.equal(firstRows[0]?.reason,"fixture_lineage_not_authoritative");
 assert.equal((await journal.append(first,key)).kind,"exact_replay");
 const second=signP9FixtureDecision({...base,revision:2,priorRevision:1,
  priorFingerprint:first.fingerprint,decisionId:"d10-two",nonce:"d10-nonce-two",mode:"paused"},key);
 assert.equal((await journal.append(second,key)).kind,"appended");
 const rows=await db`SELECT mode,revision,authority_verified,claim_allowed,dispatch_allowed
 FROM ugp11_transport_fixture.control_projection_review
 WHERE tenant_id='d10-tenant' AND site_id='d10-site'`;
 assert.equal(rows.length,1);assert.equal(rows[0]?.mode,"paused");
 assert.equal(Number(rows[0]?.revision),2);
 assert.equal(rows[0]?.authority_verified,false);
 assert.equal(rows[0]?.claim_allowed,false);
 assert.equal(rows[0]?.dispatch_allowed,false);
 const controls=await db`SELECT COUNT(*)::int AS count FROM ugp11_transport_fixture.controls WHERE tenant_id='d10-tenant'`;
 assert.equal(controls[0]?.count,0);
});
