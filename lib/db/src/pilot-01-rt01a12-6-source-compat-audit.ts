/**
 * RT01-A12.6 source-only compatibility gate.
 * Identifies blockers, never approves deployment or executes SQL.
 * Reads only caller-supplied file strings; no imports from operational code.
 */
export type SourceSnapshot = Readonly<{
  core: string; auth: string; candidate: string; adapter: string;
  authFoundation: string; trustedBoundary: string; trustedSite: string;
  pilotQueue: string; worker: string; schemaIndex: string;
  migrationPaths: readonly string[];
}>;
export type AuditFinding = Readonly<{
  id: string; severity: "blocker" | "review";
  blocked: boolean; explanation: string;
}>;

export function assessCompatibility(s: SourceSnapshot): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const check=(id:string,severity:AuditFinding["severity"],blocked:boolean,explanation:string)=>
    findings.push({id,severity,blocked,explanation});
  const core=s.core,auth=s.auth,c=s.candidate,a=s.adapter;
  check("CANONICAL_UUID", "blocker",
    !/CREATE TABLE organizations\s*\([^]*?\bid uuid PRIMARY KEY/i.test(core)||
    !/CREATE TABLE sites\s*\([^]*?\bid uuid PRIMARY KEY/i.test(core)||
    !/organization_id uuid NOT NULL REFERENCES organizations\(id\)/i.test(core),
    "Canonical organization/site UUID authority must be preserved.");
  check("COMPOSITE_SITE_SCOPE","blocker",
    !/ON public\.sites\s*\(organization_id,\s*id\)/i.test(c)||
    !/FOREIGN KEY\s*\(organization_id,site_id\)\s*REFERENCES public\.sites\s*\(organization_id,id\)/i.test(c),
    "Cross-tenant site scope must be enforced by a composite site FK.");
  check("SESSION_NOT_MEMBERSHIP","blocker",true,
    "auth_sessions carries subject and global role but no canonical organization membership; separately authenticated membership provider and revocation proof remain absent from runtime.");
  check("ISSUER_CUSTODY","blocker",true,
    "Candidate issuer_id and provenance hash are caller-correlatable fields, not a durable authenticated issuer registry or signature verification.");
  check("PRINCIPAL_MARKER_NOT_AUTH","blocker",
    !s.trustedBoundary.includes("DISCONNECTED, MOCK-BACKED")||
    !s.trustedSite.includes("No request handlers, credentials, SQL, HTTP"),
    "Trusted boundary is disconnected and cannot authenticate live request or validate actual membership.");
  check("ROLE_POLICY","blocker",
    !/CREATE POLICY\s+\S+\s+ON pilot01\./i.test(c),
    "FORCE RLS without tenant policies denies app roles; neither role custody nor effective tenant RLS is certified.");
  check("FORCE_RLS_SHAPE","blocker",
    !["grants","jobs","admissions","job_events","outbox"].every(t=>
      c.includes("ALTER TABLE pilot01."+t+" ENABLE ROW LEVEL SECURITY;") &&
      c.includes("ALTER TABLE pilot01."+t+" FORCE ROW LEVEL SECURITY;")),
    "Both ENABLE and FORCE RLS must remain declared on all five PILOT-01 tables.");
  check("OPERATION_DENY","blocker",
    !/operation IN \('analyze','recommend'\)/i.test(c)||
    /site_write|write_products/.test(c),
    "Only read-only analyze/recommend operations permitted by candidate.");
  check("TRANSACTION_SHAPE","review",
    !/await this\.db\.begin\(async tx\s*=>/.test(a)||
    !/UPDATE pilot01\.grants SET state='consumed'/.test(a)||
    !/INSERT INTO pilot01\.jobs/.test(a)||
    !/INSERT INTO pilot01\.admissions/.test(a)||
    !/INSERT INTO pilot01\.job_events/.test(a),
    "Disposable adapter should place consume/job/admission/event in one transaction; this is static shape, not runtime proof.");
  check("CONFLICT_AND_RECONCILE","review",
    !/pg_advisory_xact_lock/.test(a)||
    !/reconcileAdmission/.test(a)||
    !/return \{status:"commit_unknown"\}/.test(a),
    "Idempotency collision and unknown commit need independent process/transport fault tests.");
  check("FENCED_DB_CLOCK","review",
    !/lease_expires_at>clock_timestamp\(\)/.test(a)||
    !/generation=\$7/.test(a)||
    !/worker_owner=\$6/.test(a),
    "Worker transitions must CAS exact owner+generation and DB-clock lease.");
  check("NO_OUTBOX_DISPATCH","blocker",
    !/kind==="outbox_eligible"\)return \{status:"denied"\}/.test(a),
    "Outbox remains disabled and cannot authorize provider/site effects.");
  check("LEGACY_QUEUE_ISOLATION","blocker",true,
    "pilot-orchestration uses public.jobs and setImmediate with 20-minute stale recovery; it has no authenticated pilot01 grant/fencing adapter and must not be used as fallback.");
  check("MIGRATION_LANE","blocker",
    s.migrationPaths.some(p=>/pilot01|a12[_-]/i.test(p))||
    !/CREATE SCHEMA pilot01/.test(c)||
    !/CREATE UNIQUE INDEX pilot01_sites_organization_id_id_unique/.test(c),
    "PILOT-01 SQL candidate must remain out of operational migration directory until separately authorized.");
  check("SCHEMA_INDEX","review",/export \*\s+from/.test(s.schemaIndex.replace(/^\s*\/\/.*$/gm,"")),
    "DB schema index must not silently export candidate/runtime adapter.");
  check("FULL_MIGRATION_DRIFT","blocker",true,
    "Minimal fresh PG17 fixture does not verify canonical migration ledger/checksums, existing composite index, lock time, owner privileges, RLS policies or production drift.");
  check("WORKER_CREDENTIAL_BOUNDARY","blocker",true,
    "Source-only worker capability statements do not certify effective production flags, credentials, scheduling or isolation; require independent deployment inspection.");
  check("AUTH_ENFORCEMENT_RUNTIME","blocker",
    !/AUTH_ENFORCEMENT_ENABLED/.test(s.authFoundation)||
    !/revoked_at IS NULL AND expires_at>/.test(s.authFoundation),
    "Auth middleware/session enforcement must be attested in target environment and bound to tenant/issuer at admission transaction time.");
  check("CANDIDATE_NOT_INSTALLED","blocker",true,
    "SQL candidate is not a migration and must not be considered applied or production-compatible.");
  return findings;
}
