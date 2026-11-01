/**
 * Offline, opt-in candidate settings parser for future CH staging wiring.
 * Does not read process.env, open connections, provision principals or mount routes.
 * A caller must supply the reviewed trusted authorities explicitly.
 */
export type CustomerStagingPolicy = Readonly<{
  trustedAuthorities: readonly string[];
  maxAgeMs: number;
}>;

export function parseCustomerStagingPolicy(input: {
  trustedAuthorities?: unknown;
  maxAgeMs?: unknown;
}): CustomerStagingPolicy | null {
  const names = input.trustedAuthorities;
  const age = input.maxAgeMs;
  if (!Array.isArray(names) || names.length === 0 || names.length > 20 ||
      !names.every((name): name is string =>
        typeof name === "string" && name === name.trim() &&
        name.length > 0 && name.length <= 128 &&
        /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(name)) ||
      new Set(names).size !== names.length ||
      typeof age !== "number" || !Number.isSafeInteger(age) ||
      age < 60_000 || age > 7 * 24 * 60 * 60_000) return null;
  return Object.freeze({ trustedAuthorities: Object.freeze([...names]), maxAgeMs: age });
}
