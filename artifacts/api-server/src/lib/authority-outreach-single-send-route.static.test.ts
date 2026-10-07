import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname,join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here=dirname(fileURLToPath(import.meta.url));
const route=readFileSync(
  join(here,"../routes/authority-opportunities.ts"),
  "utf8",
);

test("UGP-10.32 mock route explicitly requires auth and same origin",()=>{
  assert.match(route,/\/authority\/outreach\/single-send\/mock/);
  assert.match(route,/if\(!req\.auth\)/);
  assert.match(route,/same_origin_single_send_required/);
  assert.match(route,/verifiedActorId\(req\)/);
  assert.match(route,/executeAuthorityOutreachMockSingleSendRequest/);
});

test("UGP-10.32 authority route exposes no non-mock send endpoint",()=>{
  assert.doesNotMatch(route,/router\.post\("\/authority\/outreach\/single-send"(?!\/mock)/);
  assert.doesNotMatch(route,/smtp|nodemailer|sendgrid|mailgun|postmark|resend/i);
});
