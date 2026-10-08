# Governance, security and operational safety

## Authority hierarchy
Repository instructions and existing production guardrails take precedence. This branch supplies proposals only. No permission to deploy, publish, migrate production DB, send email, access customer secrets, or merge.

## Risk tiers
LOW: reversible draft or non-production content evaluation.
MEDIUM: approved publishing to noncritical content.
HIGH: live high-traffic page, commercial claims, customer policies, regulated/YMYL content.
PROHIBITED WITHOUT SEPARATE AUTHORIZATION: bulk publishing, irreversible changes, unapproved provider calls, tenant-crossing reads, production schema changes, credential rotation.

## Threat model
Prompt injection from SERPs and CMS content; fabricated citations; poisoned research sources; unauthorized customer data exposure; licensing violations; duplicate/doorway content; model self-certification; content overwrites; race conditions; partial writes; false success receipts; provider retries causing duplicate posts; compromised media; unsafe HTML/JS; incorrect canonicals/noindex; misattributed SEO gains.

## Controls
Treat external content as data; allowlisted tool actions; separate generator/evaluator; provenance checks; content sanitization; tenant isolation; least privilege; explicit policy decisions; immutable audit trails; pre-write snapshots; optimistic concurrency; verified readback; reconciliation for PUBLISH_UNKNOWN; rollback and kill switch; spend/rate limits; escalation for YMYL and legal/financial claims.

## Quality policy
No claim that a detector score predicts rankings. No fabricated experience, testing, authorship or endorsements. Google indexing and search visibility are outcomes to monitor, never promised by publication.
