# Proposed interfaces and data contracts
These are logical contracts, not claims that APIs already exist.

## Core types
ContentOpportunity {tenant_id, site_id, intent_id, query_evidence_refs, objective, observed_at}
ContentDecision {decision_id, opportunity_id, action, rationale, confidence, evidence_refs, policy_version}
EvidenceItem {evidence_id, source_uri, source_type, observed_at, published_at?, license, permitted_use, content_hash, tenant_scope}
ClaimRecord {claim_id, normalized_claim, evidence_ids, support_status, verified_at, verifier_version, freshness_policy}
ContributionManifest {content_id, contribution_type, evidence_ids, novelty_basis, reviewer_status}
ContentArtifact {artifact_id, version, target_url?, format, content_hash, protected_regions, claim_ids, locale, author_provenance}
EvaluationReport {artifact_id, evaluator_version, rubric_version, findings, hard_failures, advisory_scores, outcome}
PublishProposal {proposal_id, artifact_version, target_site, adapter_type, action, expected_remote_revision, idempotency_key, policy_decision_id}
PublishReceipt {proposal_id, provider_request_id?, remote_object_id?, remote_revision?, outcome, observed_at}
LiveVerification {proposal_id, fetched_url, canonical, rendered_content_hash, indexability, media_integrity, verification_status}
OutcomeObservation {artifact_id, window, baseline, control?, metric, value, uncertainty, source}

## State machines
Artifact: PROPOSED -> RESEARCHING -> EVIDENCE_READY -> DRAFT -> EVALUATING -> READY_FOR_REVIEW -> APPROVED -> READY_FOR_PUBLISH; terminal REJECTED / PRESERVED / CANCELLED.
Publication: NOT_REQUESTED -> AUTHORIZED -> DISPATCHING -> PUBLISHED_UNVERIFIED -> VERIFIED; exceptional PUBLISH_UNKNOWN / FAILED / ROLLBACK_REQUIRED.
No transition to AUTHORIZED based solely on a model response.

## API requirements
Explicit versioning, schema validation, tenant authorization, immutable artifact hashes, optimistic revision checks, bounded retries, idempotency and auditable state transitions. No secrets in logs or evidence snapshots. Never silently coerce missing source evidence into verified claims.

## Adapter capabilities
Discover capabilities before use: create_draft, update_draft, schedule, publish, update_live, fetch_live, rollback, media_upload, metadata_update. Unsupported operations must fail closed, not emulate via unsafe side effects.
