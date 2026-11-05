/**
 * RT01-A12.2 — mutation-resistant, source-only negative checks.
 * Never executes DDL, imports a DB client or reads environment credentials.
 * These are textual contract checks, not SQL parser/DB/RLS certification.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../../../docs/sql-candidates/rt01-a12-1-pilot01-additive.sql", import.meta.url);
const tables = ["grants", "jobs", "admissions", "job_events", "outbox"] as const;

function statements(source: string): string {
  return source.replace(/^\s*--.*$/gm, "").replace(/\s+/g, " ").trim();
}

export function inspectCandidate(source: string): string[] {
  const sql = statements(source);
  const errors: string[] = [];
  const demand = (pattern: RegExp, label: string) => {
    if (!pattern.test(sql)) errors.push(label);
  };
  const forbid = (pattern: RegExp, label: string) => {
    if (pattern.test(sql)) errors.push(label);
  };

  demand(/^BEGIN;\s*CREATE UNIQUE INDEX pilot01_sites_organization_id_id_unique\s+ON public\.sites\s*\(organization_id,\s*id\);/, "canonical composite index missing");
  demand(/\bCREATE SCHEMA pilot01;/, "separate namespace missing");
  demand(/FOREIGN KEY\s*\(organization_id,\s*site_id\)\s+REFERENCES public\.sites\s*\(organization_id,\s*id\)\s+ON DELETE RESTRICT/, "same tenant/site FK missing");
  demand(/session_id uuid NOT NULL REFERENCES public\.auth_sessions\(id\) ON DELETE RESTRICT/, "session FK missing");
  demand(/issuer_provenance_sha256 char\(64\) NOT NULL/, "issuer provenance constraint missing");
  demand(/CHECK\s*\(operation IN\s*\('analyze','recommend'\)\)/, "read-only grant operation missing");
  demand(/state='issued' AND consumed_at IS NULL AND revoked_at IS NULL/, "issued state shape weakened");
  demand(/state='consumed' AND consumed_at IS NOT NULL AND revoked_at IS NULL/, "consumed state shape weakened");
  demand(/state='revoked' AND revoked_at IS NOT NULL AND consumed_at IS NULL/, "revoked state shape weakened");
  demand(/FOREIGN KEY\s*\(grant_id,organization_id,site_id,actor_subject,issuer_id,operation\)\s+REFERENCES pilot01\.grants/, "job/grant composite FK missing");
  demand(/FOREIGN KEY\s*\(job_id,grant_id,organization_id,site_id,actor_subject,issuer_id,operation\)\s+REFERENCES pilot01\.jobs/, "admission/job composite FK missing");
  demand(/FOREIGN KEY\s*\(admission_id,job_id,grant_id,organization_id,site_id\)\s+REFERENCES pilot01\.admissions/g, "event/outbox admission FK missing");
  const admissionLinks = sql.match(/FOREIGN KEY\s*\(admission_id,job_id,grant_id,organization_id,site_id\)\s+REFERENCES pilot01\.admissions/g) ?? [];
  if (admissionLinks.length !== 2) errors.push("event and outbox must both reference admission scope");
  demand(/UNIQUE\s*\(organization_id,idempotency_key\)/, "idempotency uniqueness missing");
  demand(/generation bigint NOT NULL DEFAULT 0 CHECK\s*\(generation >= 0\)/, "lease generation missing");
  demand(/state text NOT NULL DEFAULT 'blocked'\s+CHECK\s*\(state IN\s*\('blocked','eligible','delivered','cancelled','uncertain'\)\)/, "outbox must be blocked by default");
  demand(/CREATE TRIGGER pilot01_admissions_immutable\s+BEFORE UPDATE OR DELETE ON pilot01\.admissions/, "immutable admissions guard missing");
  demand(/CREATE TRIGGER pilot01_job_events_immutable\s+BEFORE UPDATE OR DELETE ON pilot01\.job_events/, "immutable events guard missing");
  for (const table of tables) {
    demand(new RegExp("ALTER TABLE pilot01\\." + table + " ENABLE ROW LEVEL SECURITY;"), table + " RLS enabled missing");
    demand(new RegExp("ALTER TABLE pilot01\\." + table + " FORCE ROW LEVEL SECURITY;"), table + " RLS forced missing");
    demand(new RegExp("CREATE TABLE pilot01\\." + table + "\\s*\\("), table + " table missing");
  }
  demand(/REVOKE ALL ON SCHEMA pilot01 FROM PUBLIC;/, "public schema revoke missing");
  demand(/REVOKE ALL ON ALL TABLES IN SCHEMA pilot01 FROM PUBLIC;/, "public table revoke missing");
  demand(/REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilot01 FROM PUBLIC;/, "public function revoke missing");
  demand(/COMMIT;$/, "transaction end missing");
  forbid(/\b(?:INSERT INTO|TRUNCATE|DROP TABLE|DROP SCHEMA|CREATE POLICY|ALTER POLICY|DISABLE ROW LEVEL SECURITY|CREATE ROLE|CREATE DATABASE|CREATE EXTENSION|SET ROLE|SET SESSION AUTHORIZATION|COPY)\b/i, "unsafe or operative SQL statement");
  forbid(/\bGRANT\b\s+(?:ALL|SELECT|INSERT|UPDATE|DELETE|USAGE|EXECUTE)/i, "new privilege grants forbidden");
  forbid(/\b(?:ALTER|CREATE|DROP)\s+TABLE\s+(?:public\.)?(?:jobs|auth_sessions|policy_mutation_dispatches)\b/i, "legacy table mutation forbidden");
  forbid(/\b(?:site_write|write_products|update_meta_description)\b/i, "write operation included");
  return errors;
}

test("RT01-A12.2 approved candidate meets source-only security contracts", async () => {
  assert.match(sourceUrl.pathname, /\/docs\/sql-candidates\/rt01-a12-1-pilot01-additive\.sql$/);
  const source = await readFile(sourceUrl, "utf8");
  assert.deepEqual(inspectCandidate(source), []);
});

test("RT01-A12.2 detects stripped tenant/identity integrity and changed operation scope", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const mutants = [
    ["same tenant/site FK", source.replace("FOREIGN KEY (organization_id,site_id)", "FOREIGN KEY (site_id)")],
    ["session FK", source.replace("REFERENCES public.auth_sessions(id)", "REFERENCES public.sites(id)")],
    ["issuer provenance", source.replace("issuer_provenance_sha256 char(64) NOT NULL", "issuer_provenance_sha256 text")],
    ["operation scope", source.replace("operation IN ('analyze','recommend')", "operation IN ('analyze','recommend','site_write')")],
    ["admission FK", source.replace("REFERENCES pilot01.jobs(job_id,grant_id", "REFERENCES pilot01.jobs(job_id")],
    ["idempotency", source.replace("UNIQUE(organization_id,idempotency_key)", "UNIQUE(idempotency_key)")],
  ];
  for (const [name, mutated] of mutants) {
    assert.notEqual(mutated, source, name + " mutation must be effective");
    assert.ok(inspectCandidate(mutated).length > 0, name + " regression was not detected");
  }
});

test("RT01-A12.2 detects privilege/RLS/immutability downgrades", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const mutants = [
    source.replace("ALTER TABLE pilot01.jobs FORCE ROW LEVEL SECURITY;", ""),
    source.replace("ALTER TABLE pilot01.outbox ENABLE ROW LEVEL SECURITY;", ""),
    source.replace("BEFORE UPDATE OR DELETE ON pilot01.admissions", "BEFORE UPDATE ON pilot01.admissions"),
    source.replace("REVOKE ALL ON SCHEMA pilot01 FROM PUBLIC;", ""),
    source.replace("REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilot01 FROM PUBLIC;", ""),
    source.replace("COMMIT;", "GRANT SELECT ON pilot01.grants TO PUBLIC;\nCOMMIT;"),
    source.replace("COMMIT;", "CREATE POLICY permissive ON pilot01.jobs USING (true);\nCOMMIT;"),
    source.replace("COMMIT;", "ALTER TABLE pilot01.jobs DISABLE ROW LEVEL SECURITY;\nCOMMIT;"),
  ];
  for (const mutated of mutants) {
    assert.notEqual(mutated, source);
    assert.ok(inspectCandidate(mutated).length > 0, "privilege downgrade was not detected");
  }
});

test("RT01-A12.2 detects replay, lease, outbox or legacy-table weakening", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const mutants = [
    source.replace("DEFAULT 0 CHECK (generation >= 0)", "DEFAULT 0"),
    source.replace("state text NOT NULL DEFAULT 'blocked'", "state text NOT NULL DEFAULT 'eligible'"),
    source.replace("UNIQUE(organization_id,idempotency_key)", ""),
    source.replace("COMMIT;", "ALTER TABLE public.jobs ADD COLUMN pilot_grant uuid;\nCOMMIT;"),
    source.replace("COMMIT;", "INSERT INTO pilot01.grants DEFAULT VALUES;\nCOMMIT;"),
    source.replace("COMMIT;", "CREATE ROLE pilot_operator;\nCOMMIT;"),
  ];
  for (const mutated of mutants) {
    assert.notEqual(mutated, source);
    assert.ok(inspectCandidate(mutated).length > 0, "replay/lease/outbox/legacy weakening was not detected");
  }
});

test("RT01-A12.2 static inspection is non-executing and remains outside migration lane", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const cleaned = statements(source);
  assert.equal((cleaned.match(/\bCREATE TABLE pilot01\./g) ?? []).length, 5);
  assert.equal((cleaned.match(/\bCREATE SCHEMA pilot01;/g) ?? []).length, 1);
  assert.doesNotMatch(cleaned, /\b(?:CREATE|ALTER|DROP)\s+TABLE\s+public\.(?:jobs|auth_sessions|policy_mutation_dispatches)\b/i);
});
