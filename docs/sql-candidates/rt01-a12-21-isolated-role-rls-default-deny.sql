-- RT01-A12.21 / SOURCE-ONLY ROLE + RLS CANDIDATE / NO OPERATIONAL AUTHORITY.
-- Execute ONLY in newly created, empty, attested A12.21 CI PostgreSQL 17.
-- Prerequisites: canonical 0001-0011, A12.1, A12.14, A12.16 candidates.
-- No production migration, no provider, no API or worker integration.
BEGIN;

-- Explicit separation of service identities. NOLOGIN means these role names
-- cannot authenticate. NOINHERIT and NOBYPASSRLS prohibit ambient escalation.
-- These are disposable-design identities, NOT operational roles.
CREATE ROLE pilot01_a12_21_api NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE pilot01_a12_21_worker NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE pilot01_a12_21_migrator NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE pilot01_a12_21_owner NOLOGIN NOINHERIT NOBYPASSRLS;

-- No membership is granted between these identities. Migrator/owner are
-- intentionally denied privileges by this candidate: ownership transfer and
-- deployment role issuance require a separate, resource-specific authorization.
-- There is deliberately no generic tenant GUC policy. PostgreSQL clients can
-- SET arbitrary custom GUCs: current_setting('pilot01.tenant_id') alone is NOT
-- authentication and must never be used as a tenant authorization predicate.
REVOKE ALL ON SCHEMA pilot01 FROM PUBLIC;
GRANT USAGE ON SCHEMA pilot01 TO pilot01_a12_21_api,pilot01_a12_21_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA pilot01 FROM PUBLIC;

-- Narrow read-only access, but no row is visible because the existing FORCE
-- RLS tables have zero policies for either service identity.
GRANT SELECT ON pilot01.grants,pilot01.admissions
  TO pilot01_a12_21_api;
GRANT SELECT ON pilot01.jobs,pilot01.job_events,pilot01.outbox
  TO pilot01_a12_21_worker;

-- Custody authority tables and events are NOT readable or mutable by
-- the API or worker roles. No EXECUTE, TRIGGER, CREATE, UPDATE, DELETE or
-- INSERT grants, and no RLS policies for these service principals.
REVOKE ALL ON pilot01.tenant_memberships,pilot01.issuer_custody,
  pilot01.custody_revocation_events FROM
  pilot01_a12_21_api,pilot01_a12_21_worker;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pilot01 FROM PUBLIC;

-- Existing FORCE RLS remains enabled; explicit guard protects against
-- accidental drift in the source-only candidate replay.
ALTER TABLE pilot01.grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.grants FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.admissions FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.job_events FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.issuer_custody ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.issuer_custody FORCE ROW LEVEL SECURITY;
ALTER TABLE pilot01.custody_revocation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot01.custody_revocation_events FORCE ROW LEVEL SECURITY;
COMMIT;
