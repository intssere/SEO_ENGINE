import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveTrustedPilotContext, type PilotTrustedEvidencePorts,
  type PilotIssuerEvidence, type PilotMembershipEvidence,
  type PilotSessionEvidence, type PilotSiteEvidence,
} from "./pilot-01-trusted-site-context.js";

const NOW = Date.parse("2026-11-04T00:00:00.000Z");
const session: PilotSessionEvidence = {
  sessionId: "synthetic-session", subject: "synthetic-subject",
  role: "admin", revoked: false, expiresAt: "2026-11-05T00:00:00.000Z",
};
const site: PilotSiteEvidence = {
  siteId: "synthetic-site", organizationId: "synthetic-organization", active: true,
};
const membership: PilotMembershipEvidence = {
  subject: session.subject, organizationId: site.organizationId, role: "admin", status: "active",
};
const issuer: PilotIssuerEvidence = {
  issuerId: "synthetic-issuer", organizationId: site.organizationId,
  siteId: site.siteId, actorSubject: session.subject, operation: "analyze",
  status: "active", expiresAt: "2026-11-05T00:00:00.000Z",
};
const intent = { siteId: site.siteId, issuerId: issuer.issuerId, operation: "analyze" as const };
type EvidenceOverride = {
  session?: PilotSessionEvidence | null;
  site?: PilotSiteEvidence | null;
  membership?: PilotMembershipEvidence | null;
  issuer?: PilotIssuerEvidence | null;
};
function mocks(overrides: EvidenceOverride = {}, calls: string[] = []): PilotTrustedEvidencePorts {
  return {
    session: { async resolve() { calls.push("session"); return overrides.session === undefined ? session : overrides.session; } },
    site: { async find(siteId) { calls.push("site:" + siteId); return overrides.site === undefined ? site : overrides.site; } },
    membership: { async find(subject, org) { calls.push("membership:" + subject + ":" + org); return overrides.membership === undefined ? membership : overrides.membership; } },
    issuer: { async find(id) { calls.push("issuer:" + id); return overrides.issuer === undefined ? issuer : overrides.issuer; } },
    now: () => NOW,
  };
}

test("RT01-A4: verified synthetic evidence derives immutable actor, tenant, site and issuer", async () => {
  const calls: string[] = [];
  const out = await resolveTrustedPilotContext(intent, mocks({}, calls));
  assert.equal(out.status, "verified");
  if (out.status === "verified") {
    assert.equal(out.context.actorId, session.subject);
    assert.equal(out.context.tenantId, site.organizationId);
    assert.equal(out.context.siteId, site.siteId);
    assert.equal(out.context.issuerId, issuer.issuerId);
    assert.equal(out.context.sessionId, session.sessionId);
    assert.equal(out.context.role, "admin");
    assert.equal(Object.isFrozen(out.context), true);
  }
  assert.deepEqual(calls, [
    "session", "site:synthetic-site",
    "membership:synthetic-subject:synthetic-organization", "issuer:synthetic-issuer",
  ]);
});

test("RT01-A4: malformed or write intent denied before touching evidence", async () => {
  for (const candidate of [
    null, { ...intent, siteId: "" }, { ...intent, siteId: " synthetic-site" },
    { ...intent, issuerId: "" }, { ...intent, operation: "site_write" },
    { ...intent, operation: "delete" },
  ]) {
    const calls: string[] = [];
    const result = await resolveTrustedPilotContext(candidate as typeof intent, mocks({}, calls));
    assert.deepEqual(result, { status: "denied" });
    assert.deepEqual(calls, []);
  }
});

test("RT01-A4: missing, revoked, expired, malformed or viewer session denies before site lookup", async () => {
  for (const value of [
    null, { ...session, revoked: true }, { ...session, role: "viewer" },
    { ...session, role: "superadmin" }, { ...session, sessionId: "" },
    { ...session, subject: " " }, { ...session, expiresAt: "2026-11-03T00:00:00.000Z" },
    { ...session, expiresAt: "bad" }, { ...session, expiresAt: "2026-11-04T00:00:00.000Z" },
  ]) {
    const calls: string[] = [];
    assert.deepEqual(await resolveTrustedPilotContext(intent, mocks({ session: value as PilotSessionEvidence | null }, calls)), { status: "denied" });
    assert.deepEqual(calls, ["session"]);
  }
});

test("RT01-A4: site and organization spoofing or inactivity denies before issuer lookup", async () => {
  for (const value of [
    null, { ...site, siteId: "another-site" },
    { ...site, organizationId: "another-org" }, { ...site, active: false },
    { ...site, organizationId: "" },
  ]) {
    const calls: string[] = [];
    const expectedMembership = value && value.organizationId && value.active === true && value.siteId === intent.siteId
      ? ["session","site:synthetic-site","membership:synthetic-subject:another-org"]
      : ["session","site:synthetic-site"];
    const actual = await resolveTrustedPilotContext(intent, mocks({ site: value as PilotSiteEvidence | null }, calls));
    assert.deepEqual(actual, { status: "denied" });
    assert.deepEqual(calls, expectedMembership);
  }
});

test("RT01-A4: cross-org, cross-subject, revoked and viewer membership denied", async () => {
  for (const value of [
    null, { ...membership, organizationId: "other-org" },
    { ...membership, subject: "other-actor" },
    { ...membership, status: "revoked" }, { ...membership, role: "viewer" },
  ]) {
    const calls: string[] = [];
    assert.deepEqual(await resolveTrustedPilotContext(intent, mocks({ membership: value as PilotMembershipEvidence | null }, calls)), { status: "denied" });
    assert.equal(calls.some(x => x.startsWith("issuer:")), false);
  }
});

test("RT01-A4: issuer mismatch, expiration, revocation or different operation denied", async () => {
  for (const value of [
    null, { ...issuer, issuerId: "other" }, { ...issuer, organizationId: "other" },
    { ...issuer, siteId: "other" }, { ...issuer, actorSubject: "other" },
    { ...issuer, operation: "recommend" }, { ...issuer, status: "revoked" },
    { ...issuer, expiresAt: "bad" },
    { ...issuer, expiresAt: "2026-11-04T00:00:00.000Z" },
  ]) {
    assert.deepEqual(await resolveTrustedPilotContext(intent, mocks({ issuer: value as PilotIssuerEvidence | null })), { status: "denied" });
  }
});

test("RT01-A4: least-privileged role even with independently verified admin membership", async () => {
  const out = await resolveTrustedPilotContext(intent, mocks({
    session: { ...session, role: "operator" },
  }));
  assert.equal(out.status, "verified");
  if (out.status === "verified") assert.equal(out.context.role, "analyst");
  const out2 = await resolveTrustedPilotContext(intent, mocks({
    membership: { ...membership, role: "operator" },
  }));
  assert.equal(out2.status, "verified");
  if (out2.status === "verified") assert.equal(out2.context.role, "analyst");
});

test("RT01-A4: missing evidence service, invalid clock and errors fail closed", async () => {
  assert.deepEqual(await resolveTrustedPilotContext(intent, { ...mocks(), now: () => NaN }), { status: "unavailable" });
  const broken = mocks();
  broken.issuer.find = async () => { throw Error("offline store failure"); };
  assert.deepEqual(await resolveTrustedPilotContext(intent, broken), { status: "unavailable" });
  const brokenSession = mocks();
  brokenSession.session.resolve = async () => { throw Error("session store unreachable"); };
  assert.deepEqual(await resolveTrustedPilotContext(intent, brokenSession), { status: "unavailable" });
});

test("RT01-A4: source-only checks neither consume grants nor dispatch queue and providers", async () => {
  const calls: string[] = [];
  const result = await resolveTrustedPilotContext(intent, mocks({}, calls));
  assert.equal(result.status, "verified");
  assert.equal(calls.length, 4);
});
