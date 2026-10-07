import assert from "node:assert/strict";
import test from "node:test";
import {
  authorityOutreachMockSingleSendRuntimeCapability,
  parseAuthorityOutreachMockSingleSendRequest,
} from "./authority-outreach-single-send-runtime.js";

const base={
  reservationId:"uaosr-"+"a".repeat(24),
  reservationFingerprint:"a".repeat(64),
  contactPointType:"email_address",
  contactPointValue:"editor@publisher.example.org",
  sourceDomain:"publisher.example.org",
  requestFingerprint:"b".repeat(64),
  subject:"Reviewed subject",
  body:"Reviewed body",
  mockOutcome:"accepted",
};
const confirmation=[
  "EXECUTE_OUTREACH_SINGLE_SEND_MOCK",
  base.mockOutcome,
  base.reservationId,
  base.reservationFingerprint,
].join(":");

test("UGP-10.32 mock runtime is disabled by default and always disabled in production",()=>{
  assert.equal(
    authorityOutreachMockSingleSendRuntimeCapability({}).mockExecutionEnabled,
    false,
  );
  assert.equal(
    authorityOutreachMockSingleSendRuntimeCapability({
      NODE_ENV:"development",
      UGP_10_32_MOCK_EXECUTION_ENABLED:"true",
    }).mockExecutionEnabled,
    true,
  );
  const production=authorityOutreachMockSingleSendRuntimeCapability({
    NODE_ENV:"production",
    UGP_10_32_MOCK_EXECUTION_ENABLED:"true",
  });
  assert.equal(production.mockExecutionEnabled,false);
  assert.equal(production.disabledInProduction,true);
  assert.equal(production.realProviderAdapterAvailable,false);
  assert.equal(production.networkOperationAvailable,false);
});

test("UGP-10.32 parser requires exact one-message confirmation and rejects extra fields",()=>{
  const parsed=parseAuthorityOutreachMockSingleSendRequest({
    ...base,
    confirmation,
    _csrf:"test",
  });
  assert.equal(parsed.reservationId,base.reservationId);
  assert.equal(parsed.payload.contactPointValue,base.contactPointValue);
  assert.equal(parsed.payload.subject,base.subject);
  assert.equal(parsed.mockOutcome,"accepted");

  assert.throws(
    ()=>parseAuthorityOutreachMockSingleSendRequest({
      ...base,
      confirmation:"WRONG",
    }),
    /explicit_mock_execution_confirmation_required/,
  );
  assert.throws(
    ()=>parseAuthorityOutreachMockSingleSendRequest({
      ...base,
      confirmation,
      extra:"forbidden",
    }),
    /unexpected_single_send_request_field/,
  );
});
