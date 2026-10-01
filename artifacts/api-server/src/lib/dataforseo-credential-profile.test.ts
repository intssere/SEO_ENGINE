import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  DATAFORSEO_PRIMARY_CREDENTIAL_PROFILE,
  describeDataForSeoCredentialProfile,
  resolveDataForSeoCredentialProfile,
  UGP_DATAFORSEO_PRIMARY_PROFILE_ID,
  UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS,
} from "./dataforseo-credential-profile.js";

test("UGP-6.1F exposes only the allowlisted DataForSEO profile and secret slot names", () => {
  const profile = describeDataForSeoCredentialProfile(
    UGP_DATAFORSEO_PRIMARY_PROFILE_ID,
  );

  assert.equal(profile, DATAFORSEO_PRIMARY_CREDENTIAL_PROFILE);
  assert.equal(profile.profileId, "dataforseo-primary");
  assert.equal(profile.loginSecretName, "DATAFORSEO_PRIMARY_LOGIN");
  assert.equal(profile.passwordSecretName, "DATAFORSEO_PRIMARY_PASSWORD");
  assert.equal(profile.provider, "dataforseo");
  assert.equal(profile.authScheme, "basic");
  assert.equal(profile.grantsProviderWrite, false);
  assert.equal(profile.grantsPublicSiteWrite, false);
  assert.equal(profile.persistence, false);

  assert.deepEqual(UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS, {
    login: "DATAFORSEO_PRIMARY_LOGIN",
    password: "DATAFORSEO_PRIMARY_PASSWORD",
  });
});

test("UGP-6.1F resolves credentials only through the injected lookup", async () => {
  const requested: string[] = [];
  const credentials = await resolveDataForSeoCredentialProfile({
    profileId: "dataforseo-primary",
    lookupSecret: async (name) => {
      requested.push(name);
      if (name === "DATAFORSEO_PRIMARY_LOGIN") return "fixture-login";
      if (name === "DATAFORSEO_PRIMARY_PASSWORD") return "fixture-password";
      return undefined;
    },
  });

  assert.deepEqual(requested, [
    "DATAFORSEO_PRIMARY_LOGIN",
    "DATAFORSEO_PRIMARY_PASSWORD",
  ]);
  assert.deepEqual(credentials, {
    login: "fixture-login",
    password: "fixture-password",
  });
});

test("UGP-6.1F rejects unknown profiles before reading any secret", async () => {
  let reads = 0;
  await assert.rejects(
    resolveDataForSeoCredentialProfile({
      profileId: "dataforseo-other",
      lookupSecret: () => {
        reads += 1;
        return "must-not-read";
      },
    }),
    /profile_not_allowlisted/,
  );
  assert.equal(reads, 0);
});

test("UGP-6.1F fails closed when either required secret is absent", async () => {
  await assert.rejects(
    resolveDataForSeoCredentialProfile({
      profileId: "dataforseo-primary",
      lookupSecret: (name) =>
        name === "DATAFORSEO_PRIMARY_LOGIN" ? undefined : "fixture-password",
    }),
    /missing_login/,
  );

  await assert.rejects(
    resolveDataForSeoCredentialProfile({
      profileId: "dataforseo-primary",
      lookupSecret: (name) =>
        name === "DATAFORSEO_PRIMARY_LOGIN" ? "fixture-login" : undefined,
    }),
    /missing_password/,
  );
});

test("UGP-6.1F rejects whitespace-drifted login without normalizing secret material", async () => {
  await assert.rejects(
    resolveDataForSeoCredentialProfile({
      profileId: "dataforseo-primary",
      lookupSecret: (name) =>
        name === "DATAFORSEO_PRIMARY_LOGIN"
          ? " fixture-login "
          : "fixture-password",
    }),
    /invalid_login/,
  );
});

test("UGP-6.1F source has no environment access, network access, logging, or runtime wiring", () => {
  const source = readFileSync(
    new URL("./dataforseo-credential-profile.ts", import.meta.url),
    "utf8",
  );
  const apiIndex = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /console\./);
  assert.doesNotMatch(source, /Authorization/i);
  assert.doesNotMatch(apiIndex, /dataforseo-credential-profile/);
  assert.doesNotMatch(apiIndex, /resolveDataForSeoCredentialProfile/);
});
