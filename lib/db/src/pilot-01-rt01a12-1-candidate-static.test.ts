/**
 * RT01-A12.1 — OFFLINE SOURCE INSPECTION ONLY.
 * Does not import postgres, open sockets, execute SQL or invoke a migration.
 * String checks establish candidate intent, not PostgreSQL correctness.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const file = new URL("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql", import.meta.url);
const load = () => readFile(file, "utf8");

test("RT01-A12.1 candidate is outside runtime migration directory and transaction-delimited",async()=>{
  assert.match(file.pathname,/\/docs\/sql-candidates\/rt01-a12-1-pilot01-additive\.sql$/);
  const sql=await load();
  assert.match(sql,/^-- RT01-A12\.1 \/ UNEXECUTED SQL CANDIDATE/);
  assert.match(sql,/\bBEGIN;[\s\S]*\bCOMMIT;\s*$/);
  assert.equal((sql.match(/\bCREATE TABLE\s+pilot01\./g)??[]).length,5);
  assert.match(sql,/CREATE SCHEMA pilot01;/);
  assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|DROP TABLE|DROP SCHEMA|ALTER TABLE public\.jobs|CREATE TABLE public\.jobs|CREATE ROLE|GRANT\s+\w+\s+ON)\b/i);
});

test("RT01-A12.1 enforces canonical organization/site integrity with composite FK",async()=>{
  const sql=await load();
  assert.match(sql,/CREATE UNIQUE INDEX pilot01_sites_organization_id_id_unique\s+ON public\.sites \(organization_id, id\)/);
  assert.match(sql,/FOREIGN KEY \(organization_id,site_id\)\s+REFERENCES public\.sites\(organization_id,id\)/);
  assert.match(sql,/session_id uuid NOT NULL REFERENCES public\.auth_sessions\(id\)/);
  assert.match(sql,/issuer_provenance_sha256 char\(64\)/);
  assert.match(sql,/operation IN \('analyze','recommend'\)/);
  assert.doesNotMatch(sql,/\bsite_write\b|\bshopify\b|\bwrite_products\b/i);
});

test("RT01-A12.1 restricts grant lifecycle and binds job/receipt composite scope",async()=>{
  const sql=await load();
  assert.match(sql,/state IN \('issued','consumed','revoked'\)/);
  assert.match(sql,/state='issued' AND consumed_at IS NULL AND revoked_at IS NULL/);
  assert.match(sql,/state='consumed' AND consumed_at IS NOT NULL AND revoked_at IS NULL/);
  assert.match(sql,/state='revoked' AND revoked_at IS NOT NULL AND consumed_at IS NULL/);
  assert.match(sql,/FOREIGN KEY\(grant_id,organization_id,site_id,actor_subject,issuer_id,operation\)\s+REFERENCES pilot01\.grants/);
  assert.match(sql,/FOREIGN KEY\(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation\)\s+REFERENCES pilot01\.jobs/);
  assert.match(sql,/UNIQUE\(organization_id,idempotency_key\)/);
  assert.match(sql,/grant_id uuid NOT NULL UNIQUE/);
  assert.match(sql,/job_id uuid NOT NULL UNIQUE/);
});

test("RT01-A12.1 binds fencing/outbox to admissions and defaults outbox blocked",async()=>{
  const sql=await load();
  assert.match(sql,/generation bigint NOT NULL DEFAULT 0 CHECK \(generation >= 0\)/);
  assert.match(sql,/worker_owner text/);
  assert.match(sql,/lease_expires_at timestamptz/);
  assert.match(sql,/FOREIGN KEY\(admission_id,job_id,grant_id,organization_id,site_id\)\s+REFERENCES pilot01\.admissions/g);
  assert.match(sql,/state text NOT NULL DEFAULT 'blocked'/);
  assert.match(sql,/UNIQUE\(organization_id,site_id,intent_sha256\)/);
});

test("RT01-A12.1 immutable receipt guards and default-deny RLS are present",async()=>{
  const sql=await load();
  for(const table of ["grants","jobs","admissions","job_events","outbox"]){
    assert.match(sql,new RegExp("ALTER TABLE pilot01\\."+table+" ENABLE ROW LEVEL SECURITY;"));
    assert.match(sql,new RegExp("ALTER TABLE pilot01\\."+table+" FORCE ROW LEVEL SECURITY;"));
  }
  for(const table of ["admissions","job_events"]){
    assert.match(sql,new RegExp("BEFORE UPDATE OR DELETE ON pilot01\\."+table));
  }
  assert.match(sql,/REVOKE ALL ON SCHEMA pilot01 FROM PUBLIC;/);
  assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA pilot01 FROM PUBLIC;/);
  assert.match(sql,/REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilot01 FROM PUBLIC;/);
  assert.doesNotMatch(sql,/CREATE POLICY|DISABLE ROW LEVEL SECURITY|SET row_security\s*=\s*off/i);
});

test("RT01-A12.1 candidate does not change baseline migrations or bootstrap source",async()=>{
  const sql=await load();
  assert.doesNotMatch(sql,/\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+TABLE\s+(?:public\.)?(?:jobs|auth_sessions|policy_mutation_dispatches)\b/i);
  assert.doesNotMatch(sql,/\b(?:SET ROLE|SET SESSION AUTHORIZATION|COPY|CREATE EXTENSION|CREATE DATABASE)\b/i);
});
