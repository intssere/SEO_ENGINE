import assert from "node:assert/strict";
import test from "node:test";
import { buildUniversalSiteIdentity } from "./universal-site-resource-identity.js";
import {
  beginConnection,
  buildConnectionHealth,
  buildConnectionStartRequest,
  buildCredentialLease,
  materializeConnectionHandle,
  planReconnect,
  refreshIfRequired,
  revokeConnection,
} from "./connection-broker-contract.js";

const site=buildUniversalSiteIdentity({
  siteId:"site-1",
  canonicalOrigin:"https://example.com",
});
const start=buildConnectionStartRequest({
  site,
  provider:"wordpress",
  connectionMode:"oauth",
  requestedAt:"2026-09-30T12:00:00.000Z",
});
const session=beginConnection({
  request:start,
  sessionId:"session-1",
  expiresAt:"2026-09-30T12:10:00.000Z",
});
const handle=materializeConnectionHandle({
  site,
  session,
  connectionId:"connection-1",
  externalAccountId:"account-1",
  credentialProfileId:"credential-profile-1",
  connectedAt:"2026-09-30T12:01:00.000Z",
  lastConfirmedAt:"2026-09-30T12:01:00.000Z",
});

test("UGP-5.1 connection broker artifacts are deterministic and authority-neutral",()=>{
  const lease=buildCredentialLease({
    handle,
    leaseId:"lease-1",
    issuedAt:"2026-09-30T12:02:00.000Z",
    expiresAt:"2026-09-30T13:02:00.000Z",
    renewable:true,
  });
  assert.equal(lease.credentialMaterialPresent,false);
  assert.equal(lease.grantsAuthorization,false);
  assert.deepEqual(buildCredentialLease({
    handle,
    leaseId:"lease-1",
    issuedAt:"2026-09-30T12:02:00.000Z",
    expiresAt:"2026-09-30T13:02:00.000Z",
    renewable:true,
  }),lease);
  assert.equal(handle.brokerPolicy.storesCredentialMaterial,false);
  assert.equal(handle.brokerPolicy.executesProviderRequests,false);
  assert.equal(handle.brokerPolicy.grantsAuthorization,false);
});

test("UGP-5.1 refresh decision is deterministic",()=>{
  const lease=buildCredentialLease({
    handle,
    leaseId:"lease-2",
    issuedAt:"2026-09-30T12:02:00.000Z",
    expiresAt:"2026-09-30T13:02:00.000Z",
    renewable:true,
  });
  assert.deepEqual(refreshIfRequired({
    lease,
    now:"2026-09-30T12:30:00.000Z",
    refreshBeforeSeconds:600,
  }),{required:false,reason:"not_required"});
  assert.deepEqual(refreshIfRequired({
    lease,
    now:"2026-09-30T12:55:00.000Z",
    refreshBeforeSeconds:600,
  }),{required:true,reason:"expiry_window"});
  assert.deepEqual(refreshIfRequired({
    lease,
    now:"2026-09-30T13:02:00.000Z",
    refreshBeforeSeconds:600,
  }),{required:true,reason:"expired"});
});

test("UGP-5.1 health and reconnect remain planning-only",()=>{
  const healthy=buildConnectionHealth({
    handle,
    status:"healthy",
    checkedAt:"2026-09-30T12:05:00.000Z",
  });
  assert.deepEqual(planReconnect({health:healthy}).required,false);

  const degraded=buildConnectionHealth({
    handle,
    status:"degraded",
    checkedAt:"2026-09-30T12:06:00.000Z",
    reason:"token_refresh_required",
  });
  const plan=planReconnect({health:degraded});
  assert.equal(plan.required,true);
  assert.equal(plan.automaticReconnect,false);
  assert.equal(plan.grantsAuthorization,false);
});

test("UGP-5.1 revocation is deterministic and non-authorizing",()=>{
  const result=revokeConnection({
    handle,
    revokedAt:"2026-09-30T12:07:00.000Z",
  });
  assert.equal(result.state,"revoked");
  assert.equal(result.grantsAuthorization,false);
});

test("UGP-5.1 fails closed on forged connection handle",()=>{
  const forged={
    ...handle,
    credentialProfileId:"other-profile",
  };
  assert.throws(()=>buildCredentialLease({
    handle:forged,
    leaseId:"lease-3",
    issuedAt:"2026-09-30T12:02:00.000Z",
    expiresAt:"2026-09-30T13:02:00.000Z",
    renewable:true,
  }),/handle_integrity_failed/);
});

test("UGP-5.1 rejects noncanonical session timing",()=>{
  assert.throws(()=>beginConnection({
    request:start,
    sessionId:"session-2",
    expiresAt:"2026-09-30T12:00:00.000Z",
  }),/session_expiry_invalid/);
});
