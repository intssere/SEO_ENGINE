export const UGP_DATAFORSEO_CREDENTIAL_PROFILE_VERSION =
  "ugp-6-1f-dataforseo-credential-profile-v1" as const;

export const UGP_DATAFORSEO_PRIMARY_PROFILE_ID = "dataforseo-primary" as const;

export const UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS = Object.freeze({
  login: "DATAFORSEO_PRIMARY_LOGIN",
  password: "DATAFORSEO_PRIMARY_PASSWORD",
} as const);

export type DataForSeoCredentialProfileId =
  typeof UGP_DATAFORSEO_PRIMARY_PROFILE_ID;

export type DataForSeoCredentialProfileDescriptor = Readonly<{
  version: typeof UGP_DATAFORSEO_CREDENTIAL_PROFILE_VERSION;
  profileId: DataForSeoCredentialProfileId;
  loginSecretName: typeof UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS.login;
  passwordSecretName: typeof UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS.password;
  provider: "dataforseo";
  authScheme: "basic";
  grantsProviderWrite: false;
  grantsPublicSiteWrite: false;
  persistence: false;
}>;

export type DataForSeoResolvedCredentials = Readonly<{
  login: string;
  password: string;
}>;

export type DataForSeoSecretLookup = (
  secretName: string,
) => string | undefined | Promise<string | undefined>;

export const DATAFORSEO_PRIMARY_CREDENTIAL_PROFILE: DataForSeoCredentialProfileDescriptor =
  Object.freeze({
    version: UGP_DATAFORSEO_CREDENTIAL_PROFILE_VERSION,
    profileId: UGP_DATAFORSEO_PRIMARY_PROFILE_ID,
    loginSecretName: UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS.login,
    passwordSecretName: UGP_DATAFORSEO_PRIMARY_SECRET_SLOTS.password,
    provider: "dataforseo",
    authScheme: "basic",
    grantsProviderWrite: false,
    grantsPublicSiteWrite: false,
    persistence: false,
  });

function exactProfileId(value: string): DataForSeoCredentialProfileId {
  if (value !== UGP_DATAFORSEO_PRIMARY_PROFILE_ID) {
    throw new Error("ugp_dataforseo_credential_profile_not_allowlisted");
  }
  return value;
}

function requiredSecret(
  value: string | undefined,
  field: "login" | "password",
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("ugp_dataforseo_credential_profile_missing_" + field);
  }
  if (field === "login" && value !== value.trim()) {
    throw new Error("ugp_dataforseo_credential_profile_invalid_login");
  }
  return value;
}

export function describeDataForSeoCredentialProfile(
  profileId: string,
): DataForSeoCredentialProfileDescriptor {
  exactProfileId(profileId);
  return DATAFORSEO_PRIMARY_CREDENTIAL_PROFILE;
}

export async function resolveDataForSeoCredentialProfile(input: {
  profileId: string;
  lookupSecret: DataForSeoSecretLookup;
}): Promise<DataForSeoResolvedCredentials> {
  const profile = describeDataForSeoCredentialProfile(input.profileId);

  const login = requiredSecret(
    await input.lookupSecret(profile.loginSecretName),
    "login",
  );
  const password = requiredSecret(
    await input.lookupSecret(profile.passwordSecretName),
    "password",
  );

  return Object.freeze({ login, password });
}
