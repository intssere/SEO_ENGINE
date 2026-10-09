import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import {signP9FixtureDecision,type P9FixtureDecision} from "./ugp-11-1d8-signed-lineage.js";
import {Ugp11FixtureDecisionJournal} from "./ugp-11-1d9-journal.js";
const h="0".repeat(64),key=Buffer.alloc(32,42);
const d:P9FixtureDecision={tenantId:"ugp11-d9-tenant",siteId:"ugp11-d9-site",
 decisionId:"d9-first",principalId:"fixture-principal",revision:1,priorRevision:0,
 priorFingerprint:h,mode:"running",effectiveAt:"2026-10-09T10:00:00.000Z",
 expiresAt:"2026-10-10T10:00:00.000Z",nonce:"d9-nonce-one"};
test("D9 refuses non-ephemeral endpoints",()=>{
 assert.throws(()=>new Ugp11FixtureDecisionJournal("postgres://user:password@remote.test/production"),/disposable_database_only/);
});
test("D9 append-only, replay, conflicting lineage and denied execution",async t=>{
 const url=process.env.UGP_11_EPHEMERAL_DATABASE_URL;
 if(!url){t.skip("explicit disposable URL missing");return;}
 const journal=new Ugp11FixtureDecisionJournal(url),db=postgres(url,{max:2,prepare:false});
 t.after(async()=>{await journal.close();await db.end({timeout:2});});
 const first=signP9FixtureDecision(d,key);
 const attempts=await Promise.all([journal.append(first,key),journal.append(first,key)]);
 assert.deepEqual(attempts.map(x=>x.kind).sort(),["appended","exact_replay"]);
 assert.ok(attempts.every(x=>!x.authorityGranted&&!x.claimAllowed&&!x.dispatchAllowed));
 const second=signP9FixtureDecision({...d,decisionId:"d9-second",nonce:"d9-nonce-two",
  revision:2,priorRevision:1,priorFingerprint:first.fingerprint,mode:"paused"},key);
 assert.equal((await journal.append(second,key)).kind,"appended");
 assert.equal((await journal.append(second,key)).kind,"exact_replay");
 assert.equal((await journal.append(signP9FixtureDecision({...d,decisionId:"d9-fork",nonce:"d9-fork",revision:2,priorRevision:1,priorFingerprint:first.fingerprint},key),key)).kind,"conflict");
 assert.equal((await journal.append({...first,mac:"f".repeat(64)},key)).kind,"invalid_signature");
 const rows=await db`SELECT count(*)::int AS count FROM ugp11_transport_fixture.decision_journal
 WHERE tenant_id='ugp11-d9-tenant' AND site_id='ugp11-d9-site'`;
 assert.equal(rows[0]?.count,2);
 await assert.rejects(db`UPDATE ugp11_transport_fixture.decision_journal SET mode='killed' WHERE tenant_id='ugp11-d9-tenant'`,/decision_journal_append_only/);
 await assert.rejects(db`DELETE FROM ugp11_transport_fixture.decision_journal WHERE tenant_id='ugp11-d9-tenant'`,/decision_journal_append_only/);
 const controls=await db`SELECT count(*)::int AS count FROM ugp11_transport_fixture.controls WHERE tenant_id='ugp11-d9-tenant'`;
 assert.equal(controls[0]?.count,0);
});
