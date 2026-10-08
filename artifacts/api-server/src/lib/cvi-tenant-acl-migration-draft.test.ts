import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../../../../lib/db/migrations/0012_cvi_tenant_site_acl_draft.sql", import.meta.url));
const sql = readFileSync(path, "utf8");

test("CVI authorization schema remains a discrete unexecuted draft", () => {
  assert.match(sql, /^-- CVI-1B\.4D DRAFT ONLY/);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;\s*$/);
  assert.equal((sql.match(/\bCREATE TABLE\b/g) ?? []).length, 3);
  assert.match(sql, /CREATE TABLE cvi_organization_memberships/);
  assert.match(sql, /CREATE TABLE cvi_site_read_grants/);
  assert.match(sql, /CREATE TABLE cvi_tenant_authorization_audit/);
  assert.doesNotMatch(sql, /\bINSERT\s+INTO\b|\bUPDATE\s+[a-z_]+\s+SET\b|\bDELETE\s+FROM\b/i);
});

test("tenant site grant requires a matching organization on both foreign keys", () => {
  assert.match(sql, /FOREIGN KEY \(organization_membership_id, organization_id\)[\s\S]*REFERENCES cvi_organization_memberships \(id, organization_id\)/);
  assert.match(sql, /FOREIGN KEY \(site_id, organization_id\)[\s\S]*REFERENCES sites \(id, organization_id\)/);
  assert.match(sql, /ADD CONSTRAINT cvi_sites_id_org_unique UNIQUE \(id, organization_id\)/);
  assert.match(sql, /UNIQUE \(id, organization_id\)/);
});

test("new membership and grant default revoked, not permission granted", () => {
  const tables = sql.split("CREATE TABLE ");
  const membership = tables.find(x => x.startsWith("cvi_organization_memberships")) ?? "";
  const grants = tables.find(x => x.startsWith("cvi_site_read_grants")) ?? "";
  assert.match(membership, /status text NOT NULL DEFAULT 'revoked'/);
  assert.match(grants, /status text NOT NULL DEFAULT 'revoked'/);
  assert.match(membership, /revoked_at timestamptz/);
  assert.match(grants, /revoked_at timestamptz/);
  assert.match(sql, /ON DELETE RESTRICT/);
});

test("no bootstrap, provider, connection credential or publishing changes in migration", () => {
  assert.doesNotMatch(sql, /\bsecret_ref\b|\baccess_token\b|\brefresh_token\b|\bPUBLIC_SITE_WRITES_ENABLED\b/);
  assert.doesNotMatch(sql, /\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\b/);
  assert.doesNotMatch(sql, /\bDROP TABLE\b|\bTRUNCATE\b|\bALTER TABLE connections\b/i);
});
