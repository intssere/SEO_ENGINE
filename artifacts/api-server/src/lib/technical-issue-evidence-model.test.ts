import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  P2_7_EXPLICITLY_UNAVAILABLE_DIMENSIONS,
  TECHNICAL_ISSUE_CATEGORIES,
  TECHNICAL_ISSUE_SEVERITIES,
  TECHNICAL_ISSUE_TAXONOMY,
  TECHNICAL_ISSUE_TAXONOMY_FINGERPRINT,
  assertTechnicalEvidenceIntegrity,
  assertTechnicalIssueIntegrity,
  assertTechnicalIssueTaxonomyIntegrity,
  createTechnicalEvidence,
  createTechnicalIssue,
  queryTechnicalIssues,
  toTechnicalFindingSignal,
  urlReferenceFromExplorerRow,
  type TechnicalIssueLineage,
  type TechnicalUrlReference,
} from "./technical-issue-evidence-model.js";

const fingerprint = (character: string) => character.repeat(64);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function urlRef(pathname = "/products/alpha"): TechnicalUrlReference {
  const canonicalUrl = `https://diamondshelf.us${pathname}`;
  return {
    canonicalUrl,
    pathname,
    urlId: hash(JSON.stringify({ canonicalUrl })),
  };
}

const lineage: TechnicalIssueLineage = {
  urlExplorerFingerprint: fingerprint("a"),
  inventoryFingerprint: fingerprint("b"),
  recrawlPlanFingerprint: fingerprint("c"),
  completionCertificationFingerprint: fingerprint("d"),
};

function retainedLastmodEvidence(url = urlRef()) {
  return createTechnicalEvidence({
    kind: "retained_fact",
    dimension: "sitemap_lastmod",
    quality: "verified",
    source: "p2_7_url_explorer",
    sourceFingerprint: lineage.urlExplorerFingerprint,
    label: "P2.7 retained sitemap lastmod state",
    value: "missing",
    affectedUrl: url,
  });
}

function suppliedEvidence(dimension: Parameters<typeof createTechnicalEvidence>[0]["dimension"], url = urlRef(), value: string | number | boolean | null = true) {
  return createTechnicalEvidence({
    kind: "supplied_observation",
    dimension,
    quality: "strong",
    source: "supplied_first_party_observation",
    sourceFingerprint: fingerprint("e"),
    label: `Supplied ${dimension} observation`,
    value,
    affectedUrl: url,
  });
}

function aggregateEvidence(value = "incomplete") {
  return createTechnicalEvidence({
    kind: "aggregate_fact",
    dimension: "crawl_completeness",
    quality: "verified",
    source: "p2_4_completion_certification",
    sourceFingerprint: lineage.completionCertificationFingerprint as string,
    label: "P2.4 completion certification",
    value,
  });
}

test("P2.8 taxonomy is deterministic, unique and compatible with the existing severity vocabulary", () => {
  assert.doesNotThrow(() => assertTechnicalIssueTaxonomyIntegrity());
  assert.match(TECHNICAL_ISSUE_TAXONOMY_FINGERPRINT, /^[a-f0-9]{64}$/);
  assert.equal(new Set(TECHNICAL_ISSUE_TAXONOMY.map((item) => item.id)).size, TECHNICAL_ISSUE_TAXONOMY.length);
  assert.deepEqual(TECHNICAL_ISSUE_SEVERITIES, ["info", "low", "medium", "high", "critical"]);
  for (const category of TECHNICAL_ISSUE_CATEGORIES) {
    assert.ok(TECHNICAL_ISSUE_TAXONOMY.some((item) => item.category === category), `taxonomy category ${category} must be represented`);
  }
});

test("P2.8 preserves the stable P2.7 URL identity when creating affected URL references", () => {
  const row = urlRef("/collections/fragrance");
  assert.deepEqual(urlReferenceFromExplorerRow(row), row);
  assert.throws(
    () => urlReferenceFromExplorerRow({ ...row, urlId: fingerprint("f") }),
    /technical_issue_url_id_mismatch/,
  );
});

test("P2.8 can build a retained-fact issue without fabricating unavailable crawl facts", () => {
  const affectedUrl = urlRef();
  const issue = createTechnicalIssue({
    typeId: "sitemap.lastmod_missing",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    evidence: [retainedLastmodEvidence(affectedUrl)],
    summary: "The supplied P2.7 inventory has no sitemap lastmod for this URL.",
  });
  assert.equal(issue.typeId, "sitemap.lastmod_missing");
  assert.equal(issue.category, "crawl_completeness");
  assert.equal(issue.severity, "info");
  assert.equal(issue.confidence, "verified");
  assert.equal(issue.affectedUrl?.urlId, affectedUrl.urlId);
  assert.deepEqual(issue.capabilities.p2_7ExplicitlyUnavailableDimensions, [...P2_7_EXPLICITLY_UNAVAILABLE_DIMENSIONS]);
  assert.equal(issue.authorization.networkExecutionEnabled, false);
  assert.equal(issue.authorization.persistenceAuthorized, false);
  assert.equal(issue.authorization.publicSiteWrites, false);
  assert.doesNotThrow(() => assertTechnicalIssueIntegrity(issue));
});

test("P2.8 permits aggregate completion issues only with site-scoped P2.4 evidence", () => {
  const issue = createTechnicalIssue({
    typeId: "crawl.inventory_incomplete",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    evidence: [aggregateEvidence()],
    summary: "The certified completion ledger does not account for the full approved inventory.",
  });
  assert.equal(issue.scope, "site");
  assert.equal(issue.affectedUrl, null);
  assert.equal(issue.severity, "high");
  assert.throws(
    () => createTechnicalIssue({
      typeId: "crawl.inventory_incomplete",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl: urlRef(),
      evidence: [aggregateEvidence()],
      summary: "Invalid site issue with URL scope.",
    }),
    /technical_issue_site_scope_forbids_url/,
  );
});

test("P2.8 cannot substantiate HTTP, canonical, indexability or fetch issues from unavailable markers", () => {
  const affectedUrl = urlRef();
  for (const dimension of ["http_status", "fetch_outcome", "redirect_target", "canonical_target", "indexability", "content_fingerprint"] as const) {
    const unavailable = createTechnicalEvidence({
      kind: "unavailable",
      dimension,
      quality: "unknown",
      source: "unavailable_marker",
      sourceFingerprint: fingerprint("f"),
      label: `${dimension} is unavailable in P2.7`,
      unavailableReason: "P2.7 does not retain this per-URL dimension.",
      affectedUrl,
    });
    assert.equal(unavailable.availability, "unavailable");
    assert.doesNotThrow(() => assertTechnicalEvidenceIntegrity(unavailable, "https://diamondshelf.us"));
  }

  const unavailableHttp = createTechnicalEvidence({
    kind: "unavailable",
    dimension: "http_status",
    quality: "unknown",
    source: "unavailable_marker",
    sourceFingerprint: fingerprint("f"),
    label: "HTTP status unavailable",
    unavailableReason: "No authorized source supplied HTTP status.",
    affectedUrl,
  });
  assert.throws(
    () => createTechnicalIssue({
      typeId: "crawlability.http_error",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl,
      evidence: [unavailableHttp],
      summary: "This must not become an HTTP error issue.",
    }),
    /technical_issue_required_evidence_missing/,
  );
});

test("P2.8 requires explicit supplied first-party observations for future-only per-URL issue types", () => {
  const affectedUrl = urlRef();
  const httpEvidence = suppliedEvidence("http_status", affectedUrl, 503);
  const issue = createTechnicalIssue({
    typeId: "crawlability.http_error",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    evidence: [httpEvidence],
    summary: "A supplied first-party observation reports HTTP 503 for this URL.",
  });
  assert.equal(issue.confidence, "high");
  assert.equal(issue.evidence[0]?.source, "supplied_first_party_observation");
  assert.equal(issue.capabilities.issueTypeAvailability, "requires_supplied_observation");

  const forgedRetained = createTechnicalEvidence({
    kind: "retained_fact",
    dimension: "canonical_url",
    quality: "verified",
    source: "p2_7_url_explorer",
    sourceFingerprint: lineage.urlExplorerFingerprint,
    label: "Canonical URL retained by P2.7",
    value: affectedUrl.canonicalUrl,
    affectedUrl,
  });
  assert.throws(
    () => createTechnicalIssue({
      typeId: "crawlability.http_error",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl,
      evidence: [forgedRetained],
      summary: "Canonical URL evidence cannot prove an HTTP error.",
    }),
    /technical_issue_required_evidence_missing/,
  );
});

test("P2.8 canonical mismatch can combine retained URL identity with supplied canonical observation", () => {
  const affectedUrl = urlRef();
  const retained = createTechnicalEvidence({
    kind: "retained_fact",
    dimension: "canonical_url",
    quality: "verified",
    source: "p2_7_url_explorer",
    sourceFingerprint: lineage.urlExplorerFingerprint,
    label: "P2.7 canonical inventory URL",
    value: affectedUrl.canonicalUrl,
    affectedUrl,
  });
  const observed = suppliedEvidence("canonical_target", affectedUrl, "https://diamondshelf.us/products/beta");
  const issue = createTechnicalIssue({
    typeId: "canonical.mismatch",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    evidence: [observed, retained],
    summary: "The supplied canonical target differs from the retained canonical inventory URL.",
  });
  assert.equal(issue.category, "canonicalization");
  assert.equal(issue.confidence, "high");
  assert.equal(issue.evidence.length, 2);
});

test("P2.8 denies cross-origin URL references, credentials, raw markup and secret-like material", () => {
  const affectedUrl = urlRef();
  const crossOrigin = { ...affectedUrl, canonicalUrl: "https://example.com/products/alpha", pathname: "/products/alpha", urlId: hash(JSON.stringify({ canonicalUrl: "https://example.com/products/alpha" })) };
  assert.throws(
    () => createTechnicalIssue({
      typeId: "metadata.title_missing",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl: crossOrigin,
      evidence: [suppliedEvidence("title", crossOrigin, "missing")],
      summary: "Cross-origin issue is invalid.",
    }),
    /technical_issue_url_reference_origin_mismatch/,
  );
  assert.throws(
    () => createTechnicalEvidence({
      kind: "supplied_observation",
      dimension: "title",
      quality: "strong",
      source: "supplied_first_party_observation",
      sourceFingerprint: fingerprint("e"),
      label: "<script>alert(1)</script>",
      value: "missing",
      affectedUrl,
    }),
    /raw_markup_denied/,
  );
  assert.throws(
    () => createTechnicalEvidence({
      kind: "supplied_observation",
      dimension: "title",
      quality: "strong",
      source: "supplied_first_party_observation",
      sourceFingerprint: fingerprint("e"),
      label: "Authorization Bearer abcdefghijklmnop",
      value: "missing",
      affectedUrl,
    }),
    /secret_material_denied/,
  );
});

test("P2.8 issue keys are stable across evidence ordering while content fingerprints remain integrity-bound", () => {
  const affectedUrl = urlRef();
  const first = suppliedEvidence("canonical_target", affectedUrl, "https://diamondshelf.us/products/beta");
  const second = createTechnicalEvidence({
    kind: "retained_fact",
    dimension: "canonical_url",
    quality: "verified",
    source: "p2_7_url_explorer",
    sourceFingerprint: lineage.urlExplorerFingerprint,
    label: "Retained URL",
    value: affectedUrl.canonicalUrl,
    affectedUrl,
  });
  const base = {
    typeId: "canonical.mismatch" as const,
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    summary: "Canonical mismatch is supported by explicit evidence.",
  };
  const a = createTechnicalIssue({ ...base, evidence: [first, second] });
  const b = createTechnicalIssue({ ...base, evidence: [second, first] });
  assert.equal(a.issueKey, b.issueKey);
  assert.equal(a.evidenceSetFingerprint, b.evidenceSetFingerprint);
  assert.equal(a.fingerprint, b.fingerprint);

  const tampered = structuredClone(a);
  tampered.summary = "Tampered summary";
  assert.throws(() => assertTechnicalIssueIntegrity(tampered), /technical_issue_fingerprint_mismatch/);
});

test("P2.8 denies severity downgrades below the taxonomy default", () => {
  const affectedUrl = urlRef();
  assert.throws(
    () => createTechnicalIssue({
      typeId: "crawlability.http_error",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl,
      evidence: [suppliedEvidence("http_status", affectedUrl, 500)],
      severity: "low",
      summary: "A high-default issue cannot be silently downgraded.",
    }),
    /technical_issue_severity_downgrade_denied/,
  );
});

test("P2.8 maps active URL issues into the existing TechnicalFindingSignal contract without severity drift", () => {
  const affectedUrl = urlRef();
  const issue = createTechnicalIssue({
    typeId: "metadata.title_missing",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    affectedUrl,
    evidence: [suppliedEvidence("title", affectedUrl, "missing")],
    summary: "A supplied first-party page observation reports a missing title.",
  });
  const finding = toTechnicalFindingSignal(issue);
  assert.deepEqual(finding, {
    findingId: issue.issueKey,
    pageId: affectedUrl.urlId,
    title: "Page title is missing",
    severity: "medium",
    evidenceId: issue.evidenceSetFingerprint,
  });

  const siteIssue = createTechnicalIssue({
    typeId: "crawl.inventory_incomplete",
    siteId: "diamond-shelf",
    canonicalOrigin: "https://diamondshelf.us",
    lineage,
    evidence: [aggregateEvidence()],
    summary: "Site-scoped aggregate issue.",
  });
  assert.throws(() => toTechnicalFindingSignal(siteIssue), /technical_issue_site_scope_not_compatible/);
});

test("P2.8 query model filters, sorts and paginates deterministically while keeping capabilities closed", () => {
  const alpha = urlRef("/products/alpha");
  const beta = urlRef("/products/beta");
  const issues = [
    createTechnicalIssue({
      typeId: "metadata.title_missing",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl: alpha,
      evidence: [suppliedEvidence("title", alpha, "missing")],
      summary: "Alpha title is missing.",
    }),
    createTechnicalIssue({
      typeId: "crawlability.http_error",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      affectedUrl: beta,
      evidence: [suppliedEvidence("http_status", beta, 500)],
      summary: "Beta returned a server error.",
      severity: "critical",
    }),
    createTechnicalIssue({
      typeId: "crawl.inventory_incomplete",
      siteId: "diamond-shelf",
      canonicalOrigin: "https://diamondshelf.us",
      lineage,
      evidence: [aggregateEvidence()],
      summary: "Inventory is incomplete.",
    }),
  ];
  const result = queryTechnicalIssues(issues, {
    severities: ["high", "critical"],
    sort: { field: "severity", direction: "desc" },
    page: { offset: 0, limit: 1 },
  });
  assert.equal(result.page.totalMatched, 2);
  assert.equal(result.page.returned, 1);
  assert.equal(result.page.hasMore, true);
  assert.equal(result.rows[0]?.severity, "critical");
  assert.equal(result.authorization.networkExecutionEnabled, false);
  assert.equal(result.authorization.persistenceAuthorized, false);
  assert.equal(result.authorization.publicationAuthorized, false);
  assert.match(result.queryFingerprint, /^[a-f0-9]{64}$/);
  assert.match(result.fingerprint, /^[a-f0-9]{64}$/);

  const byText = queryTechnicalIssues(issues, { text: "Alpha", page: { offset: 0, limit: 10 } });
  assert.equal(byText.page.totalMatched, 1);
  assert.equal(byText.rows[0]?.affectedUrl?.urlId, alpha.urlId);

  assert.throws(() => queryTechnicalIssues([issues[0] as typeof issues[number], issues[0] as typeof issues[number]]), /technical_issue_query_duplicate_issue/);
});
