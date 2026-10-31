import assert from "node:assert/strict";
import test from "node:test";
import {PILOT01_PG_QUERY_CANDIDATES as sql} from "./pilot-01-pg-query-candidates.js";
/** Static SQL-shape checks only. NOT concurrency, syntax, transaction or DB certification. */
test("job claim requires bounded new lease and increments generation",()=>{
 assert.match(sql.claim,/generation\s*=\s*generation\s*\+\s*1/);
 assert.match(sql.claim,/lease_until\s*<=\s*clock_timestamp\(\)/);
 assert.match(sql.claim,/status\s*=\s*'pending'/);
 assert.match(sql.claim,/\$5::int\s*>\s*0/);
});
test("renewal and completion match scope, current owner and generation",()=>{
 for(const query of [sql.renew,sql.complete]){
  for(const col of ["job_id","tenant_id","site_id","owner_id","generation"])
   assert.match(query,new RegExp(col+"\\s*="));
  assert.match(query,/lease_until\s*>\s*clock_timestamp\(\)/);
  assert.match(query,/status\s*=\s*'active'/);
 }
});
test("grant consumption constrains identity, expiry, state and exact-diff publish",()=>{
 for(const column of ["grant_id","tenant_id","site_id","actor_id","operation"])
  assert.match(sql.consumeGrant,new RegExp(column+"\\s*="));
 assert.match(sql.consumeGrant,/state\s*=\s*'issued'/);
 assert.match(sql.consumeGrant,/expires_at\s*>\s*clock_timestamp\(\)/);
 assert.match(sql.consumeGrant,/diff_hash\s*=\s*\$6/);
 assert.match(sql.consumeGrant,/RETURNING grant_id/);
});
test("revoke acts only on issued grants in tenant/site scope",()=>{
 assert.match(sql.revokeGrant,/tenant_id\s*=\s*\$2/);
 assert.match(sql.revokeGrant,/site_id\s*=\s*\$3/);
 assert.match(sql.revokeGrant,/state\s*=\s*'issued'/);
 assert.match(sql.revokeGrant,/state\s*=\s*'revoked'/);
});
